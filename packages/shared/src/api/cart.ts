import type { DarjeelingSupabaseClient } from '../supabase/client';
import type { Cart, CartLine } from '../types/domain';
import type { CartItemRow, MenuItemRow } from '../types/database';
import { unitPriceCents } from '../pricing';
import type { CartLineInput, GuestCart } from '../schemas';

/** Ensure the signed-in user has a cart row; returns its id. */
export async function ensureCart(supabase: DarjeelingSupabaseClient, userId: string): Promise<string> {
  const { data: existing, error } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing.id;

  const { data: created, error: insErr } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return created.id;
}

export async function fetchCart(supabase: DarjeelingSupabaseClient, userId: string): Promise<Cart> {
  const cartId = await ensureCart(supabase, userId);
  const { data: rows, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cartId)
    .order('created_at');
  if (error) throw error;

  const itemIds = Array.from(new Set((rows ?? []).map((r) => r.menu_item_id)));
  const itemsById = new Map<string, MenuItemRow>();
  if (itemIds.length > 0) {
    const { data: items, error: iErr } = await supabase
      .from('menu_items')
      .select('*')
      .in('id', itemIds);
    if (iErr) throw iErr;
    for (const i of items ?? []) itemsById.set(i.id, i);
  }

  const lines: CartLine[] = (rows ?? []).map((row: CartItemRow) => {
    const item = itemsById.get(row.menu_item_id);
    return {
      id: row.id,
      menuItemId: row.menu_item_id,
      name: item?.name ?? 'Item',
      imageUrl: item?.image_url ?? null,
      basePriceCents: item?.price_cents ?? row.unit_price_cents,
      quantity: row.quantity,
      selectedOptions: row.selected_options,
      unitPriceCents: row.unit_price_cents,
    };
  });
  return { lines };
}

export async function addCartItem(
  supabase: DarjeelingSupabaseClient,
  userId: string,
  input: CartLineInput,
): Promise<void> {
  const cartId = await ensureCart(supabase, userId);
  const { data: item, error } = await supabase
    .from('menu_items')
    .select('price_cents')
    .eq('id', input.menuItemId)
    .single();
  if (error) throw error;

  const unit = unitPriceCents(
    item.price_cents,
    input.selectedOptions.map((o) => o.priceDeltaCents),
  );
  const { error: insErr } = await supabase.from('cart_items').insert({
    cart_id: cartId,
    menu_item_id: input.menuItemId,
    quantity: input.quantity,
    selected_options: input.selectedOptions,
    unit_price_cents: unit,
  });
  if (insErr) throw insErr;
}

export async function updateCartItemQuantity(
  supabase: DarjeelingSupabaseClient,
  cartItemId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    await removeCartItem(supabase, cartItemId);
    return;
  }
  const { error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', cartItemId);
  if (error) throw error;
}

export async function removeCartItem(
  supabase: DarjeelingSupabaseClient,
  cartItemId: string,
): Promise<void> {
  const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
  if (error) throw error;
}

export async function clearCart(supabase: DarjeelingSupabaseClient, userId: string): Promise<void> {
  const cartId = await ensureCart(supabase, userId);
  const { error } = await supabase.from('cart_items').delete().eq('cart_id', cartId);
  if (error) throw error;
}

/**
 * Merge a guest cart (from local storage) into the signed-in user's cart.
 * Called right after sign-in. Appends every guest line.
 */
export async function mergeGuestCart(
  supabase: DarjeelingSupabaseClient,
  userId: string,
  guest: GuestCart,
): Promise<void> {
  if (guest.lines.length === 0) return;
  const cartId = await ensureCart(supabase, userId);
  const rows = guest.lines.map((line) => ({
    cart_id: cartId,
    menu_item_id: line.menuItemId,
    quantity: line.quantity,
    selected_options: line.selectedOptions,
    unit_price_cents: line.unitPriceCents,
  }));
  const { error } = await supabase.from('cart_items').insert(rows);
  if (error) throw error;
}
