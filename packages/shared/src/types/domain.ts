/** App-facing composite shapes assembled from DB rows. */
import type {
  CategoryRow,
  ItemOptionRow,
  LocationScheduleRow,
  MenuItemRow,
  OptionChoiceRow,
  OrderItemRow,
  OrderRow,
  SelectedOption,
} from './database';

export type Tag = 'veg' | 'spicy' | 'bestseller';

export interface OptionChoice extends OptionChoiceRow {}

export interface ItemOption extends ItemOptionRow {
  choices: OptionChoice[];
}

export interface MenuItem extends MenuItemRow {
  options: ItemOption[];
}

export interface Category extends CategoryRow {
  items: MenuItem[];
}

export type Menu = Category[];

export interface CartLine {
  /** Stable id for the line in the UI (cart_item id, or a client id when guest). */
  id: string;
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  basePriceCents: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  unitPriceCents: number;
}

export interface Cart {
  lines: CartLine[];
}

export interface TodaySchedule extends LocationScheduleRow {}

export interface Order extends OrderRow {
  items: OrderItemRow[];
  /** The pickup location this order is collected from (null for legacy orders). */
  location?: LocationScheduleRow | null;
}

export interface OrderSummary extends OrderRow {
  item_count: number;
}
