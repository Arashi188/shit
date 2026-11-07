import type { Mailer, MailMessage } from "./mailer.js";

export class ConsoleMailer implements Mailer {
  constructor(private readonly log: (line: string) => void = console.info) {}

  async send(message: MailMessage): Promise<void> {
    const [local, domain] = message.to.split("@");
    const masked = local && domain ? `${local.slice(0, 1)}***@${domain}` : "[invalid recipient]";
    this.log(`[dev mail] ${message.template} → ${masked}`);
    if (message.template === "email-verification" && message.variables.verificationUrl) this.log(`[dev verification link] ${message.variables.verificationUrl}`);
    if (message.template === "password-reset" && message.variables.resetUrl) this.log(`[dev password reset link] ${message.variables.resetUrl}`);
  }
}
