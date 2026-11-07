import type { RequestHandler } from "express";
import { AGE_GATE_COOKIE, readCookie, type AgeGate } from "../integrations/age-gate/age-gate.js";
import { AgeGateAcceptanceSchema, AgeGateDeclineSchema, EmptyQuerySchema } from "./schemas.js";

export const healthHandler: RequestHandler = (req, res) => {
  if (!EmptyQuerySchema.safeParse(req.query).success) return res.status(400).json({ error: "Invalid request" });
  return res.status(200).json({ status: "ok", service: "serein-api", version: 1 });
};

export function createAgeGateHandlers(ageGate: AgeGate, secureCookie: boolean) {
  const status: RequestHandler = (req, res) => {
    if (!EmptyQuerySchema.safeParse(req.query).success) return res.status(400).json({ error: "Invalid request" });
    const proof = readCookie(req.headers.cookie, AGE_GATE_COOKIE);
    return res.status(200).json({ accepted: ageGate.isAccepted(proof) });
  };

  const accept: RequestHandler = (req, res) => {
    if (!AgeGateAcceptanceSchema.safeParse(req.body).success) {
      return res.status(400).json({ error: "Confirm that you are 18 or older to continue" });
    }
    const proof = ageGate.issueAcceptanceProof();
    res.cookie(AGE_GATE_COOKIE, proof, {
      httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/", maxAge: 365 * 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({ accepted: true });
  };

  const decline: RequestHandler = (req, res) => {
    if (!AgeGateDeclineSchema.safeParse(req.body).success) return res.status(400).json({ error: "Invalid request" });
    res.clearCookie(AGE_GATE_COOKIE, { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/" });
    return res.status(204).end();
  };

  return { status, accept, decline };
}
