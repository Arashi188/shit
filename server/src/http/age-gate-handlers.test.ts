import type { Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { createAgeGateHandlers, healthHandler } from "./age-gate-handlers.js";
import { AGE_GATE_COOKIE } from "../integrations/age-gate/age-gate.js";
import { requireAgeVerified } from "../integrations/age-gate/require-age-verified.js";
import { SelfDeclaredAgeGate } from "../integrations/age-gate/self-declared-age-gate.js";

const gate = new SelfDeclaredAgeGate("test-only-age-gate-secret-with-enough-length-123");

function request({ query = {}, body = {}, cookie }: { query?: object; body?: object; cookie?: string } = {}): Request {
  return { query, body, headers: cookie ? { cookie } : {} } as unknown as Request;
}

function response() {
  const captured: { status: number; body?: unknown; cookie?: { name: string; value: string; options: unknown }; cleared?: string } = { status: 200 };
  const res = {
    status(code: number) { captured.status = code; return res; },
    json(body: unknown) { captured.body = body; return res; },
    cookie(name: string, value: string, options: unknown) { captured.cookie = { name, value, options }; return res; },
    clearCookie(name: string) { captured.cleared = name; return res; },
    end() { return res; },
  } as unknown as Response;
  return { res, captured };
}

function run(handler: (req: Request, res: Response, next: (error?: unknown) => void) => unknown, req = request()) {
  const { res, captured } = response();
  let passed = false;
  handler(req, res, () => { passed = true; });
  return { captured, passed };
}

describe("versioned age-gate handlers", () => {
  it("serves health and rejects unexpected query fields", () => {
    expect(run(healthHandler).captured).toMatchObject({ status: 200, body: { status: "ok", service: "serein-api", version: 1 } });
    expect(run(healthHandler, request({ query: { unexpected: "true" } })).captured.status).toBe(400);
  });

  it("requires a valid self-declaration and issues an HTTP-only signed cookie", () => {
    const handlers = createAgeGateHandlers(gate, false);
    expect(run(handlers.accept, request({ body: { confirmedAdult: false } })).captured.status).toBe(400);
    const accepted = run(handlers.accept, request({ body: { confirmedAdult: true } }));
    expect(accepted.captured).toMatchObject({ status: 200, body: { accepted: true } });
    expect(accepted.captured.cookie?.name).toBe(AGE_GATE_COOKIE);
    expect(accepted.captured.cookie?.options).toMatchObject({ httpOnly: true, sameSite: "lax", secure: false, path: "/" });
    const cookie = `${AGE_GATE_COOKIE}=${encodeURIComponent(accepted.captured.cookie!.value)}`;
    expect(run(handlers.status, request({ cookie })).captured.body).toEqual({ accepted: true });
  });

  it("enforces age verification middleware and clears on decline", () => {
    const guard = requireAgeVerified(gate);
    const blocked = run(guard);
    expect(blocked.captured).toMatchObject({ status: 403, body: { code: "AGE_VERIFICATION_REQUIRED" } });
    const proof = gate.issueAcceptanceProof();
    const allowed = run(guard, request({ cookie: `${AGE_GATE_COOKIE}=${proof}` }));
    expect(allowed.passed).toBe(true);
    const handlers = createAgeGateHandlers(gate, false);
    expect(run(handlers.decline, request({ body: { confirmedMinor: false } })).captured.status).toBe(400);
    expect(run(handlers.decline, request({ body: { confirmedMinor: true } })).captured.status).toBe(204);
  });
});
