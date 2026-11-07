import { describe, expect, it } from "vitest";
import { CartRuleError, type CartLine, type CouponRule, type ShippingOption } from "./cart.js";
import { OrderStateError, createOrderQuote, transitionOrderState } from "./order.js";

const lines: CartLine[] = [
  { productId: "p-1", name: "Quiet Serum", slug: "quiet-serum", priceMinor: 4000, currencyCode: "USD", stockQuantity: 8, quantity: 2, imageUrl: null },
];

const coupon: CouponRule = {
  code: "SAVE10",
  percentOff: 10,
  amountOffMinor: null,
  currencyCode: "USD",
  minimumSubtotalMinor: 1000,
  usageLimit: 10,
  usedCount: 0,
  startsAt: null,
  expiresAt: null,
  isEnabled: true,
};

const shipping: ShippingOption = {
  id: "ship-1",
  name: "Standard",
  currencyCode: "USD",
  feeMinor: 500,
  estimatedDaysMin: 3,
  estimatedDaysMax: 6,
  countryCode: null,
};

describe("order workflow", () => {
  it("allows valid transitions and rejects invalid ones", () => {
    expect(transitionOrderState("pending", "paid")).toBe("paid");
    expect(transitionOrderState("paid", "processing")).toBe("processing");
    expect(() => transitionOrderState("shipped", "pending")).toThrow(OrderStateError);
  });

  it("creates a pending order quote from cart contents", () => {
    const quote = createOrderQuote(lines, coupon, shipping);
    expect(quote).toMatchObject({ status: "pending", subtotalMinor: 8000, discountMinor: 800, shippingMinor: 500, totalMinor: 7700, currencyCode: "USD" });
    expect(quote.lines[0]?.lineTotalMinor).toBe(8000);
  });

  it("rejects empty carts and invalid checkout totals", () => {
    expect(() => createOrderQuote([], coupon, shipping)).toThrow(CartRuleError);
    expect(() => createOrderQuote(lines, { ...coupon, currencyCode: "EUR" }, shipping)).toThrow(CartRuleError);
  });
});
