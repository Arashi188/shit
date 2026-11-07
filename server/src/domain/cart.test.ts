import { describe, expect, it } from "vitest";
import { assertStock, CartRuleError, priceCart, type CartLine, type CouponRule, type ShippingOption } from "./cart.js";

const lines: CartLine[] = [{ productId: "p", name: "Item", slug: "item", priceMinor: 5000, currencyCode: "ABC", stockQuantity: 4, quantity: 2, imageUrl: null }];
const coupon: CouponRule = { code: "SAVE10", percentOff: 10, amountOffMinor: null, currencyCode: "ABC", minimumSubtotalMinor: 1000, usageLimit: 10, usedCount: 0, startsAt: null, expiresAt: null, isEnabled: true };
const shipping: ShippingOption = { id: "s", name: "Standard", currencyCode: "ABC", feeMinor: 400, estimatedDaysMin: 3, estimatedDaysMax: 6, countryCode: null };
describe("cart pricing", () => {
  it("calculates totals in integer minor units", () => { expect(priceCart(lines, coupon, shipping)).toMatchObject({ subtotalMinor: 10000, discountMinor: 1000, shippingMinor: 400, totalMinor: 9400, currencyCode: "ABC" }); });
  it("caps fixed discounts at subtotal", () => { expect(priceCart(lines, { ...coupon, percentOff: null, amountOffMinor: 50000 }, null).discountMinor).toBe(10000); });
  it("rejects disabled, expired, exhausted, below-minimum or wrong-currency coupons", () => {
    for (const invalid of [{ isEnabled: false }, { expiresAt: new Date(Date.now() - 1000) }, { usageLimit: 1, usedCount: 1 }, { minimumSubtotalMinor: 20000 }, { currencyCode: "XYZ" }]) expect(() => priceCart(lines, { ...coupon, ...invalid } as CouponRule, null)).toThrow(CartRuleError);
  });
  it("rejects mixed currencies, mismatched shipping and stock excess", () => {
    expect(() => priceCart([...lines, { ...lines[0]!, productId: "x", currencyCode: "XYZ" }], null, null)).toThrow(CartRuleError);
    expect(() => priceCart(lines, null, { ...shipping, currencyCode: "XYZ" })).toThrow(CartRuleError);
    expect(() => assertStock(5, 4)).toThrow(CartRuleError);
  });
});
