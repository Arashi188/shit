import { ConsoleMailer } from "./console-mailer.js";
import type { Mailer, MailMessage } from "./mailer.js";

export type MailerProviderOptions = {
  from?: string | undefined;
  resendApiKey?: string | undefined;
};

class DisabledMailer implements Mailer {
  async send(): Promise<void> {
    return;
  }
}

class ResendMailer implements Mailer {
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(message: MailMessage): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: this.subjectFor(message.template),
        html: this.renderHtml(message),
        text: this.renderText(message),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Resend mail send failed: ${text}`);
    }
  }

  private subjectFor(template: MailMessage["template"]): string {
    switch (template) {
      case "account-created":
        return "Welcome to Serein";
      case "order-confirmation":
        return "Your Serein order is confirmed";
      case "payment-receipt":
        return "Your Serein payment receipt";
      case "shipment-update":
        return "Your Serein shipment update";
      case "password-reset":
        return "Reset your Serein password";
      case "email-verification":
        return "Verify your Serein email";
    }
  }

  private renderHtml(message: MailMessage): string {
    const summary = Object.entries(message.variables)
      .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
      .join("");
    return `
      <html>
        <body>
          <h1>${this.subjectFor(message.template)}</h1>
          <p>Hi,</p>
          <ul>${summary}</ul>
        </body>
      </html>
    `;
  }

  private renderText(message: MailMessage): string {
    return Object.entries(message.variables)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
  }
}

export function createMailer(mode: "console" | "resend" | "disabled" = "console", options: MailerProviderOptions = {}): Mailer {
  if (mode === "disabled") return new DisabledMailer();
  if (mode === "resend") {
    if (!options.resendApiKey) {
      throw new Error("RESEND_API_KEY is required when MAILER_PROVIDER=resend");
    }
    return new ResendMailer(options.resendApiKey, options.from ?? "noreply@localhost");
  }
  return new ConsoleMailer();
}
