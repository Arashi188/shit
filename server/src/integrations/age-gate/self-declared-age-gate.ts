import { createHmac, timingSafeEqual } from "node:crypto";
import type { AgeGate } from "./age-gate.js";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export class SelfDeclaredAgeGate implements AgeGate {
  constructor(private readonly secret: string) {
    if (secret.length < 32) throw new Error("Age-gate signing secret must be at least 32 characters");
  }

  issueAcceptanceProof(now = new Date()): string {
    const payload = Buffer.from(`v1:${now.getTime()}:${now.getTime() + YEAR_MS}`).toString("base64url");
    const signature = this.sign(payload);
    return `${payload}.${signature}`;
  }

  isAccepted(proof: string | undefined, now = new Date()): boolean {
    if (!proof) return false;
    const [payload, signature, extra] = proof.split(".");
    if (!payload || !signature || extra !== undefined) return false;
    const expected = this.sign(payload);
    const actualBytes = Buffer.from(signature);
    const expectedBytes = Buffer.from(expected);
    if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return false;
    try {
      const decoded = Buffer.from(payload, "base64url").toString("utf8").split(":");
      const [version, acceptedAtText, expiresAtText] = decoded;
      const acceptedAt = Number(acceptedAtText);
      const expiresAt = Number(expiresAtText);
      return version === "v1" && Number.isSafeInteger(acceptedAt) && Number.isSafeInteger(expiresAt)
        && acceptedAt <= now.getTime() && expiresAt > now.getTime() && expiresAt - acceptedAt === YEAR_MS;
    } catch {
      return false;
    }
  }

  private sign(payload: string): string {
    return createHmac("sha256", this.secret).update(payload).digest("base64url");
  }
}
