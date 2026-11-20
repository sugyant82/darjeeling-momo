import { z } from 'zod';
import { ORDER_STATUSES } from './order-status';

export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const userRoleSchema = z.enum(['customer', 'staff', 'admin']);
export const tagSchema = z.enum(['veg', 'spicy', 'bestseller']);
export const platformSchema = z.enum(['ios', 'android', 'web']);
export const pickupTypeSchema = z.enum(['home', 'truck']);

export const selectedOptionSchema = z.object({
  optionId: z.string(),
  optionName: z.string(),
  choiceId: z.string(),
  choiceLabel: z.string(),
  priceDeltaCents: z.number().int(),
});
export type SelectedOptionInput = z.infer<typeof selectedOptionSchema>;

export const cartLineInputSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  selectedOptions: z.array(selectedOptionSchema).default([]),
});
export type CartLineInput = z.infer<typeof cartLineInputSchema>;

export const guestCartSchema = z.object({
  lines: z.array(
    z.object({
      id: z.string(),
      menuItemId: z.string().uuid(),
      name: z.string(),
      imageUrl: z.string().nullable(),
      basePriceCents: z.number().int(),
      quantity: z.number().int().min(1).max(50),
      selectedOptions: z.array(selectedOptionSchema),
      unitPriceCents: z.number().int(),
    }),
  ),
});
export type GuestCart = z.infer<typeof guestCartSchema>;

/** Checkout / create-order input (sent to the create-payment Edge Function). */
export const createOrderInputSchema = z.object({
  items: z.array(cartLineInputSchema).min(1),
  pickupSlotIso: z.string().datetime().nullable(),
  pickupAsap: z.boolean().default(false),
  locationId: z.string().uuid().nullable(),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(20)
    .regex(/^[0-9+()\-\s]+$/, 'Enter a valid phone number'),
  notes: z.string().max(500).optional().default(''),
});
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

/** Response from the create-payment Edge Function. */
export const createPaymentResponseSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('mock'),
    orderId: z.string().uuid(),
    orderNumber: z.string(),
    amountCents: z.number().int(),
  }),
  z.object({
    provider: z.literal('stripe'),
    orderId: z.string().uuid(),
    orderNumber: z.string(),
    amountCents: z.number().int(),
    clientSecret: z.string(),
    publishableKey: z.string(),
  }),
]);
export type CreatePaymentResponse = z.infer<typeof createPaymentResponseSchema>;

/** Admin: menu item upsert. */
export const menuItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(300).optional().default(''),
  priceCents: z.number().int().min(0),
  tags: z.array(tagSchema).default([]),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().url().nullable().optional(),
  sort: z.number().int().default(0),
  prepMinutes: z.number().int().min(0).max(600).default(15),
  /** null = untracked (always available); >=0 = ready-made stock count. */
  stockQty: z.number().int().min(0).max(100000).nullable().default(null),
});
export type MenuItemInput = z.infer<typeof menuItemInputSchema>;

export const categoryInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(60),
  sort: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

/** Admin: schedule upsert. */
export const scheduleInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    pickupType: pickupTypeSchema.default('truck'),
    place: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(200),
    mapLink: z.string().url().nullable().optional(),
    openTime: z.string().regex(/^\d{2}:\d{2}$/),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/),
    slotMinutes: z.number().int().min(5).max(120),
    maxOrdersPerSlot: z.number().int().min(1).max(100),
    prepBufferMinutes: z.number().int().min(0).max(240).default(0),
    acceptingOrders: z.boolean().default(true),
    isClosed: z.boolean().default(false),
  })
  .refine((v) => v.isClosed || v.openTime < v.closeTime, {
    message: 'Open time must be before close time',
    path: ['closeTime'],
  });
export type ScheduleInput = z.infer<typeof scheduleInputSchema>;

export const profileInputSchema = z.object({
  name: z.string().trim().max(80).optional(),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+()\-\s]*$/, 'Enter a valid phone number')
    .optional(),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

export const pushTokenInputSchema = z.object({
  token: z.string().min(1),
  platform: platformSchema,
});
export type PushTokenInput = z.infer<typeof pushTokenInputSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: orderStatusSchema,
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
