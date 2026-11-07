import { describe, expect, it } from "vitest";
import { MockPaymentProvider } from "./mock-payment-provider.js";

describe("MockPaymentProvider", () => {
  it("creates idempotent intents and verifies webhook state", async () => {
    const provider = new MockPaymentProvider();
    const input = { orderId: "order-1", amount: { amountMinor: 2599, currency: "USD" }, idempotencyKey: "order-1" };
    const first = await provider.initiate(input);
    const second = await provider.initiate(input);
    expect(first).toEqual(second);
    expect(await provider.verify(first.reference)).toBe("pending");
    await provider.handleWebhook({ eventId: "evt-1", reference: first.reference, type: "payment.succeeded" });
    expect(await provider.verify(first.reference)).toBe("paid");
  });

  it("validates money and only refunds paid mock intents", async () => {
    const provider = new MockPaymentProvider();
    await expect(provider.initiate({ orderId: "order-2", amount: { amountMinor: 10.5, currency: "USD" }, idempotencyKey: "x" })).rejects.toThrow();
    const intent = await provider.initiate({ orderId: "order-2", amount: { amountMinor: 500, currency: "USD" }, idempotencyKey: "order-2" });
    await expect(provider.refund(intent.reference)).rejects.toThrow(/Only paid/);
    await provider.handleWebhook({ eventId: "evt-2", reference: intent.reference, type: "payment.succeeded" });
    await expect(provider.refund(intent.reference, { amountMinor: 501, currency: "USD" })).rejects.toThrow(/Refund amount/);
    expect(await provider.refund(intent.reference, { amountMinor: 500, currency: "USD" })).toBe("refunded");
  });
});
