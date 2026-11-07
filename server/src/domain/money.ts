import { z } from "zod";

export const MoneySchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO code"),
}).strict();

export type Money = z.infer<typeof MoneySchema>;
