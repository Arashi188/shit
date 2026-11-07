import { z } from "zod";
import { MoneySchema, type Money } from "../../domain/money.js";
import type { PaymentIntent, PaymentProvider, PaymentState } from "./payment-provider.js";

const webhookSchema = z.object({
  eventId: z.string().min(1),
  reference: z.string().min(1),
  type: z.enum(["payment.succeeded", "payment.failed", "payment.refunded"]),
}).strict();

export class MockPaymentProvider implements PaymentProvider {
  private readonly intents = new Map<string, PaymentIntent>();
  private readonly eventIds = new Set<string>();

  async initiate(input: { orderId: string; amount: Money; idempotencyKey: string }): Promise<PaymentIntent> {
    const amount = MoneySchema.parse(input.amount);
    if (!input.orderId.trim() || !input.idempotencyKey.trim() || amount.amountMinor <= 0) {
      throw new Error("A valid order, idempotency key, and positive amount are required");
    }
    const reference = `mock_${input.idempotencyKey}`;
    const existing = this.intents.get(reference);
    if (existing) return structuredClone(existing);
    const intent: PaymentIntent = { reference, orderId: input.orderId, amount, state: "pending" };
    this.intents.set(reference, intent);
    return structuredClone(intent);
  }

  async verify(reference: string): Promise<PaymentState> {
    return this.requireIntent(reference).state;
  }

  async refund(reference: string, amount?: Money): Promise<PaymentState> {
    const intent = this.requireIntent(reference);
    if (amount) {
      const validated = MoneySchema.parse(amount);
      if (validated.currency !== intent.amount.currency || validated.amountMinor > intent.amount.amountMinor) {
        throw new Error("Refund amount must match the payment currency and not exceed the payment amount");
      }
    }
    if (intent.state !== "paid") throw new Error("Only paid mock payments can be refunded");
    intent.state = "refunded";
    return intent.state;
  }

  async handleWebhook(payload: unknown, _signature?: string): Promise<{ eventId: string; state: PaymentState }> {
    const event = webhookSchema.parse(payload);
    const intent = this.requireIntent(event.reference);
    if (!this.eventIds.has(event.eventId)) {
      intent.state = event.type === "payment.succeeded" ? "paid" : event.type === "payment.failed" ? "failed" : "refunded";
      this.eventIds.add(event.eventId);
    }
    return { eventId: event.eventId, state: intent.state };
  }

  private requireIntent(reference: string): PaymentIntent {
    const intent = this.intents.get(reference);
    if (!intent) throw new Error("Unknown mock payment reference");
    return intent;
  }
}
