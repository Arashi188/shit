import { describe, expect, it } from "vitest";
import { SelfDeclaredAgeGate } from "./self-declared-age-gate.js";

const secret = "test-only-age-gate-secret-with-enough-length-123";
const year = 365 * 24 * 60 * 60 * 1000;

describe("SelfDeclaredAgeGate", () => {
  it("issues a proof accepted by the server verifier", () => {
    const gate = new SelfDeclaredAgeGate(secret);
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(gate.isAccepted(gate.issueAcceptanceProof(now), now)).toBe(true);
  });

  it("rejects missing, forged, not-yet-valid, and expired proofs", () => {
    const gate = new SelfDeclaredAgeGate(secret);
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(gate.isAccepted(undefined, now)).toBe(false);
    expect(gate.isAccepted("not.a.proof", now)).toBe(false);
    expect(gate.isAccepted(gate.issueAcceptanceProof(new Date(now.getTime() + 1000)), now)).toBe(false);
    expect(gate.isAccepted(gate.issueAcceptanceProof(new Date(now.getTime() - year - 1)), now)).toBe(false);
  });

  it("rejects proofs signed by a different secret", () => {
    const proof = new SelfDeclaredAgeGate(secret).issueAcceptanceProof();
    expect(new SelfDeclaredAgeGate(`${secret}!`).isAccepted(proof)).toBe(false);
  });
});
