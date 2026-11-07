import { createHmac, timingSafeEqual } from "node:crypto";
import { MoneySchema } from "../../domain/money.js";
import { MockPaymentProvider } from "./mock-payment-provider.js";
import type { PaymentIntent, PaymentProvider, PaymentState } from "./payment-provider.js";

export type PaymentProviderOptions = {
  stripeSecretKey?: string | undefined;
  stripeWebhookSecret?: string | undefined;
};

class DisabledPaymentProvider implements PaymentProvider {
  async initiate(): Promise<PaymentIntent> {
    throw new Error("Payment processing is disabled for this environment.");
  }

  async verify(): Promise<PaymentState> {
    throw new Error("Payment processing is disabled for this environment.");
  }

  async refund(): Promise<PaymentState> {
    throw new Error("Payment processing is disabled for this environment.");
  }

  async handleWebhook(): Promise<{ eventId: string; state: PaymentState }> {
    throw new Error("Payment processing is disabled for this environment.");
  }
}

class StripePaymentProvider implements PaymentProvider {
  constructor(private readonly secretKey: string, private readonly webhookSecret?: string) {}

  async initiate(input: { orderId: string; amount: { amountMinor: number; currency: string }; idempotencyKey: string }): Promise<PaymentIntent> {
    const amount = MoneySchema.parse(input.amount);
    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(amount.amountMinor),
        currency: amount.currency.toLowerCase(),
        description: `Order ${input.orderId}`,
        metadata: JSON.stringify({ orderId: input.orderId, idempotencyKey: input.idempotencyKey }),
        confirm: "false",
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof payload === "object" && payload && "error" in payload && payload.error && typeof payload.error === "object" && "message" in payload.error ? String((payload as any).error.message) : "Stripe payment initiation failed";
      throw new Error(message);
    }

    const paymentIntent = payload as { id?: string; status?: string };
    return {
      reference: paymentIntent.id ?? input.idempotencyKey,
      orderId: input.orderId,
      amount,
      state: paymentIntent.status === "succeeded" ? "paid" : paymentIntent.status === "canceled" ? "failed" : "pending",
    };
  }

  async verify(reference: string): Promise<PaymentState> {
    const response = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof payload === "object" && payload && "error" in payload && payload.error && typeof payload.error === "object" && "message" in payload.error ? String((payload as any).error.message) : "Stripe payment verification failed";
      throw new Error(message);
    }
    return this.mapStatus((payload as { status?: string }).status ?? "pending");
  }

  async refund(reference: string, amount?: { amountMinor: number; currency: string }): Promise<PaymentState> {
    const payload = new URLSearchParams({ payment_intent: reference });
    if (amount) {
      const validated = MoneySchema.parse(amount);
      payload.set("amount", String(validated.amountMinor));
    }

    const response = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof result === "object" && result && "error" in result && result.error && typeof result.error === "object" && "message" in result.error ? String((result as any).error.message) : "Stripe refund failed";
      throw new Error(message);
    }
    return (result as { status?: string }).status === "succeeded" ? "refunded" : "failed";
  }

  async handleWebhook(payload: unknown, signature?: string): Promise<{ eventId: string; state: PaymentState }> {
    if (this.webhookSecret && signature) {
      this.verifySignature(payload, signature);
    }

    const event = payload as { id?: string; type?: string; data?: { object?: { status?: string } } };
    if (!event.id || !event.type) {
      throw new Error("Invalid Stripe webhook payload");
    }
    const state = this.mapPayloadType(event.type, event.data?.object?.status);
    return { eventId: event.id, state };
  }

  private mapStatus(status: string): PaymentState {
    if (status === "succeeded") return "paid";
    if (status === "canceled" || status === "requires_payment_method") return "failed";
    if (status === "processing") return "pending";
    return "pending";
  }

  private mapPayloadType(type: string, status?: string): PaymentState {
    if (type.includes("refunded") || type.includes("refund")) return "refunded";
    if (type.includes("failed")) return "failed";
    if (type.includes("succeeded") || status === "succeeded") return "paid";
    return "pending";
  }

  private verifySignature(payload: unknown, signature: string): void {
    if (!this.webhookSecret) return;
    const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);
    const params = new Map(signature.split(",").map((part) => {
      const index = part.indexOf("=");
      return index === -1 ? [part, ""] : [part.slice(0, index), part.slice(index + 1)];
    }));
    const timestamp = params.get("t");
    const signed = params.get("v1");
    if (!timestamp || !signed) throw new Error("Invalid Stripe webhook signature");
    const expected = createHmac("sha256", this.webhookSecret).update(`${timestamp}.${payloadString}`).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const actualBuffer = Buffer.from(signed, "hex");
    if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
      throw new Error("Stripe webhook verification failed");
    }
  }
}

export function createPaymentProvider(mode: "mock" | "stripe" | "disabled" = "mock", options: PaymentProviderOptions = {}): PaymentProvider {
  if (mode === "disabled") return new DisabledPaymentProvider();
  if (mode === "stripe") {
    if (!options.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe");
    }
    return new StripePaymentProvider(options.stripeSecretKey, options.stripeWebhookSecret);
  }
  return new MockPaymentProvider();
}
