import { z } from "zod";

export const CartItemInput = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) }).strict();
export const CartQuantityInput = z.object({ quantity: z.number().int().min(0).max(99) }).strict();
export const CouponInput = z.object({ code: z.string().trim().min(1).max(40) }).strict();
export const ShippingInput = z.object({ shippingMethodId: z.string().uuid() }).strict();
export type CouponRule = { code: string; percentOff: number | null; amountOffMinor: number | null; currencyCode: string | null; minimumSubtotalMinor: number; usageLimit: number | null; usedCount: number; startsAt: Date | null; expiresAt: Date | null; isEnabled: boolean };
export type CartLine = { productId: string; name: string; slug: string; priceMinor: number; currencyCode: string; stockQuantity: number; quantity: number; imageUrl: string | null };
export type ShippingOption = { id: string; name: string; currencyCode: string; feeMinor: number; estimatedDaysMin: number; estimatedDaysMax: number; countryCode: string | null };
export type CartTotals = { currencyCode: string | null; subtotalMinor: number; discountMinor: number; shippingMinor: number; totalMinor: number; couponCode: string | null; lines: CartLine[] };

export class CartRuleError extends Error {}
export function priceCart(lines: CartLine[], coupon: CouponRule | null, shipping: ShippingOption | null, now = new Date()): CartTotals {
  const currencyCode = lines[0]?.currencyCode ?? shipping?.currencyCode ?? coupon?.currencyCode ?? null;
  if (lines.some((line) => line.currencyCode !== currencyCode)) throw new CartRuleError("A cart can contain products in one currency only");
  const subtotalMinor = lines.reduce((sum, line) => sum + line.priceMinor * line.quantity, 0);
  let discountMinor = 0;
  if (coupon) {
    if (!coupon.isEnabled || coupon.startsAt && coupon.startsAt > now || coupon.expiresAt && coupon.expiresAt <= now || coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new CartRuleError("This discount code is not available");
    if (subtotalMinor < coupon.minimumSubtotalMinor) throw new CartRuleError("The cart does not meet this discount’s minimum value");
    if (coupon.currencyCode && coupon.currencyCode !== currencyCode) throw new CartRuleError("This discount is not valid for the cart currency");
    discountMinor = coupon.percentOff !== null ? Math.floor(subtotalMinor * coupon.percentOff / 100) : Math.min(subtotalMinor, coupon.amountOffMinor ?? 0);
  }
  if (shipping && shipping.currencyCode !== currencyCode) throw new CartRuleError("Shipping currency does not match the cart");
  const shippingMinor = shipping?.feeMinor ?? 0;
  return { currencyCode, subtotalMinor, discountMinor, shippingMinor, totalMinor: subtotalMinor - discountMinor + shippingMinor, couponCode: coupon?.code ?? null, lines };
}
export function assertStock(quantity: number, stock: number): void { if (quantity > stock) throw new CartRuleError("Requested quantity exceeds available stock"); }
