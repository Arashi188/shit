import type { RequestHandler } from "express";
import { AGE_GATE_COOKIE, readCookie, type AgeGate } from "./age-gate.js";

export function requireAgeVerified(ageGate: AgeGate): RequestHandler {
  return (req, res, next) => {
    const proof = readCookie(req.headers.cookie, AGE_GATE_COOKIE);
    if (!ageGate.isAccepted(proof)) {
      res.status(403).json({ error: "Age confirmation required", code: "AGE_VERIFICATION_REQUIRED" });
      return;
    }
    next();
  };
}
