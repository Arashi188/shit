export interface MailMessage {
  to: string;
  template: "account-created" | "order-confirmation" | "payment-receipt" | "shipment-update" | "password-reset" | "email-verification";
  variables: Record<string, string>;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
