import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  WEB_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  AGE_GATE_SECRET: z.string().min(32, "AGE_GATE_SECRET must contain at least 32 characters"),
  DATABASE_URL: z.string().url().optional(),
  PAYMENT_PROVIDER: z.enum(["mock", "stripe", "disabled"]).default("mock"),
  MAILER_PROVIDER: z.enum(["console", "resend", "disabled"]).default("console"),
  MAILER_FROM: z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional()),
  STRIPE_SECRET_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  RESEND_API_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  CATALOG_SEED_CURRENCY: z.preprocess((value) => value === "" ? undefined : value, z.string().regex(/^[A-Z]{3}$/).optional()),
  CATALOG_SEED_CURRENCY_EXPONENT: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().min(0).max(4).optional()),
  CLOUDINARY_CLOUD_NAME: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  CLOUDINARY_API_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  CLOUDINARY_API_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  CLOUDINARY_UPLOAD_FOLDER: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
});

const parsed = configSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid server configuration: ${z.prettifyError(parsed.error)}`);
}

if (parsed.data.NODE_ENV === "production") {
  if (parsed.data.PAYMENT_PROVIDER === "mock" && process.env.PAYMENT_PROVIDER === undefined) {
    throw new Error("Production requires a configured PAYMENT_PROVIDER (for example, stripe). Set a real provider or disable the provider explicitly.");
  }
  if (parsed.data.MAILER_PROVIDER === "console" && process.env.MAILER_PROVIDER === undefined) {
    throw new Error("Production requires a configured MAILER_PROVIDER (for example, resend). Set a real provider or disable the mailer explicitly.");
  }
}

export const config = parsed.data;
