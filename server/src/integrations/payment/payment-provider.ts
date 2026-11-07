import type { Money } from "../../domain/money.js";

export type PaymentState = "pending" | "paid" | "failed" | "refunded";
export interface PaymentIntent { reference: string; orderId: string; amount: Money; state: PaymentState; }
export interface PaymentWebhook { eventId: string; reference: string; type: "payment.succeeded" | "payment.failed" | "payment.refunded"; }

export interface PaymentProvider {
  initiate(input: { orderId: string; amount: Money; idempotencyKey: string }): Promise<PaymentIntent>;
  verify(reference: string): Promise<PaymentState>;
  refund(reference: string, amount?: Money): Promise<PaymentState>;
  handleWebhook(payload: unknown, signature?: string): Promise<{ eventId: string; state: PaymentState }>;
}
