/**
 * Database types. Hand-authored to match supabase/migrations. After connecting a
 * hosted project you can regenerate with:
 *   pnpm supabase gen types typescript --local > packages/shared/src/types/database.ts
 */
import type { OrderStatus } from '../order-status';

export type UserRole = 'customer' | 'staff' | 'admin';
export type Platform = 'ios' | 'android' | 'web';

/** A selected option captured on a cart/order line (snapshot). */
export interface SelectedOption {
  optionId: string;
  optionName: string;
  choiceId: string;
  choiceLabel: string;
  priceDeltaCents: number;
}

export type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

export type CategoryRow = {
  id: string;
  name: string;
  sort: number;
  is_active: boolean;
  created_at: string;
}

export type MenuItemRow = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  tags: string[];
  is_available: boolean;
  image_url: string | null;
  sort: number;
  is_sample: boolean;
  created_at: string;
}

export type ItemOptionRow = {
  id: string;
  menu_item_id: string;
  name: string;
  required: boolean;
  min_select: number;
  max_select: number;
  sort: number;
}

export type OptionChoiceRow = {
  id: string;
  item_option_id: string;
  label: string;
  price_delta_cents: number;
  is_default: boolean;
  sort: number;
}

export type LocationScheduleRow = {
  id: string;
  date: string; // YYYY-MM-DD
  place: string;
  address: string;
  map_link: string | null;
  open_time: string; // HH:MM:SS
  close_time: string; // HH:MM:SS
  slot_minutes: number;
  max_orders_per_slot: number;
  is_closed: boolean;
}

export type CartRow = {
  id: string;
  user_id: string;
  updated_at: string;
}

export type CartItemRow = {
  id: string;
  cart_id: string;
  menu_item_id: string;
  quantity: number;
  selected_options: SelectedOption[];
  unit_price_cents: number;
  created_at: string;
}

export type OrderRow = {
  id: string;
  number: string;
  user_id: string;
  status: OrderStatus;
  location_id: string | null;
  pickup_slot: string | null; // timestamptz ISO
  notes: string | null;
  phone: string | null;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  stripe_payment_intent_id: string | null;
  payment_provider: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  selected_options: SelectedOption[];
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
}

export type PushTokenRow = {
  id: string;
  user_id: string;
  token: string;
  platform: Platform;
  created_at: string;
}

/** A foreign-key relationship, in the shape postgrest-js uses to type embedded selects. */
type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

/**
 * Table shape in the form supabase-js expects. `Relationships` is required by the
 * client's GenericTable constraint (a table without it types every query as `never`),
 * and it drives inference for embedded selects such as `order_items(count)`.
 * Only public-schema FKs are listed; references to auth.users are not resolvable here.
 */
type TableShape<Row extends Record<string, unknown>, Rels extends Relationship[] = []> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: Rels;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableShape<ProfileRow>;
      categories: TableShape<CategoryRow>;
      menu_items: TableShape<
        MenuItemRow,
        [
          {
            foreignKeyName: 'menu_items_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ]
      >;
      item_options: TableShape<
        ItemOptionRow,
        [
          {
            foreignKeyName: 'item_options_menu_item_id_fkey';
            columns: ['menu_item_id'];
            referencedRelation: 'menu_items';
            referencedColumns: ['id'];
          },
        ]
      >;
      option_choices: TableShape<
        OptionChoiceRow,
        [
          {
            foreignKeyName: 'option_choices_item_option_id_fkey';
            columns: ['item_option_id'];
            referencedRelation: 'item_options';
            referencedColumns: ['id'];
          },
        ]
      >;
      locations_schedule: TableShape<LocationScheduleRow>;
      carts: TableShape<CartRow>;
      cart_items: TableShape<
        CartItemRow,
        [
          {
            foreignKeyName: 'cart_items_cart_id_fkey';
            columns: ['cart_id'];
            referencedRelation: 'carts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cart_items_menu_item_id_fkey';
            columns: ['menu_item_id'];
            referencedRelation: 'menu_items';
            referencedColumns: ['id'];
          },
        ]
      >;
      orders: TableShape<
        OrderRow,
        [
          {
            foreignKeyName: 'orders_location_id_fkey';
            columns: ['location_id'];
            referencedRelation: 'locations_schedule';
            referencedColumns: ['id'];
          },
        ]
      >;
      order_items: TableShape<
        OrderItemRow,
        [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_menu_item_id_fkey';
            columns: ['menu_item_id'];
            referencedRelation: 'menu_items';
            referencedColumns: ['id'];
          },
        ]
      >;
      push_tokens: TableShape<PushTokenRow>;
    };
    Views: Record<string, never>;
    Functions: {
      merge_guest_cart: {
        Args: { p_items: unknown };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
