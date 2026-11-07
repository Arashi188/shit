import { z } from "zod";

export const EmptyQuerySchema = z.object({}).strict();
export const AgeGateAcceptanceSchema = z.object({ confirmedAdult: z.literal(true) }).strict();
export const AgeGateDeclineSchema = z.object({ confirmedMinor: z.literal(true) }).strict();
