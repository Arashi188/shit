import { z } from "zod";
import { CartRuleError, type CartLine, type CouponRule, type ShippingOption, priceCart } from "./cart.js";

export const OrderStatusSchema = z.enum([
  "pending",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["processing", "cancelled", "refunded"],
  processing: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
};

export class OrderStateError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot move an order from ${from} to ${to}`);
    this.name = "OrderStateError";
  }
}

export function transitionOrderState(current: OrderStatus, next: OrderStatus): OrderStatus {
  const from = OrderStatusSchema.parse(current);
  const to = OrderStatusSchema.parse(next);
  if (!ORDER_TRANSITIONS[from].includes(to)) {
    throw new OrderStateError(from, to);
  }
  return to;
}

export type OrderLine = CartLine & { lineTotalMinor: number };

export type OrderQuote = {
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currencyCode: string | null;
  couponCode: string | null;
  status: "pending";
  lines: OrderLine[];
};

export function createOrderQuote(
  lines: CartLine[],
  coupon: CouponRule | null,
  shipping: ShippingOption | null,
  now = new Date(),
): OrderQuote {
  if (lines.length === 0) throw new CartRuleError("Cart is empty");
  const totals = priceCart(lines, coupon, shipping, now);
  return {
    ...totals,
    status: "pending",
    lines: lines.map((line) => ({ ...line, lineTotalMinor: line.priceMinor * line.quantity })),
  };
}
