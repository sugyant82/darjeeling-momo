import type { DarjeelingSupabaseClient } from '../supabase/client';
import type { Category, ItemOption, Menu, MenuItem } from '../types/domain';
import type {
  CategoryRow,
  ItemOptionRow,
  MenuItemRow,
  OptionChoiceRow,
} from '../types/database';

/**
 * Fetch the full public menu: active categories with their available-or-not items
 * (sold-out items are returned so the UI can grey them out), each with options.
 */
export async function fetchMenu(supabase: DarjeelingSupabaseClient): Promise<Menu> {
  const [{ data: categories, error: cErr }, { data: items, error: iErr }, { data: options, error: oErr }, { data: choices, error: chErr }] =
    await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('sort'),
      supabase.from('menu_items').select('*').order('sort'),
      supabase.from('item_options').select('*').order('sort'),
      supabase.from('option_choices').select('*').order('sort'),
    ]);

  const err = cErr || iErr || oErr || chErr;
  if (err) throw err;

  const optionsByItem = groupBy((options ?? []) as ItemOptionRow[], (o) => o.menu_item_id);
  const choicesByOption = groupBy((choices ?? []) as OptionChoiceRow[], (c) => c.item_option_id);

  const itemsByCategory = groupBy((items ?? []) as MenuItemRow[], (i) => i.category_id);

  return (categories ?? []).map((category: CategoryRow): Category => {
    const catItems = (itemsByCategory.get(category.id) ?? []).map((item): MenuItem => {
      const itemOptions = (optionsByItem.get(item.id) ?? []).map((opt): ItemOption => ({
        ...opt,
        choices: choicesByOption.get(opt.id) ?? [],
      }));
      return { ...item, options: itemOptions };
    });
    return { ...category, items: catItems };
  });
}

export async function fetchMenuItem(
  supabase: DarjeelingSupabaseClient,
  itemId: string,
): Promise<MenuItem | null> {
  const { data: item, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw error;
  if (!item) return null;

  // Fail loudly: an item shown without its (possibly required) options would let invalid lines through.
  const { data: options, error: optErr } = await supabase
    .from('item_options')
    .select('*')
    .eq('menu_item_id', itemId)
    .order('sort');
  if (optErr) throw optErr;
  const optionIds = (options ?? []).map((o) => o.id);
  let choices: OptionChoiceRow[] = [];
  if (optionIds.length > 0) {
    const { data, error: choiceErr } = await supabase
      .from('option_choices')
      .select('*')
      .in('item_option_id', optionIds)
      .order('sort');
    if (choiceErr) throw choiceErr;
    choices = (data ?? []) as OptionChoiceRow[];
  }

  const choicesByOption = groupBy(choices, (c) => c.item_option_id);
  const itemOptions = ((options ?? []) as ItemOptionRow[]).map((opt) => ({
    ...opt,
    choices: choicesByOption.get(opt.id) ?? [],
  }));
  return { ...item, options: itemOptions };
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}
