import { describe, expect, it, vi } from "vitest";
import { AuthService, hasPermission, tokenHash, verifyPassword, type AuthRepository, type AuthRecord, type AuthUser } from "./auth.js";

const user: AuthUser = { id: "u1", email: "one@example.test", displayName: "One", roles: ["customer"], permissions: [] };
function setup() {
  let passwordHash = "";
  let sessionHash = "";
  let resetHash = "";
  let verificationHash = "";
  let isVerified = false;
  const repo: AuthRepository = {
    createUser: vi.fn(async (input) => { passwordHash = input.passwordHash; return user; }),
    findUserByEmail: vi.fn(async () => passwordHash ? { ...user, passwordHash, emailVerifiedAt: isVerified ? new Date() : null } as AuthRecord : null),
    createSession: vi.fn(async (_id, hash) => { sessionHash = hash; }),
    findSession: vi.fn(async (hash) => hash === sessionHash ? { user, expiresAt: new Date(Date.now() + 60_000) } : null),
    deleteSession: vi.fn(async () => { sessionHash = ""; }),
    createPasswordReset: vi.fn(async (_email, hash) => { resetHash = hash; return true; }),
    consumePasswordReset: vi.fn(async (hash, nextHash) => { if (!resetHash || hash !== resetHash) return false; passwordHash = nextHash; resetHash = ""; return true; }),
    createEmailVerification: vi.fn(async (_email, hash) => { verificationHash = hash; return true; }),
    consumeEmailVerification: vi.fn(async (hash) => { if (!verificationHash || hash !== verificationHash) return false; verificationHash = ""; isVerified = true; return true; }),
  };
  const mailer = { send: vi.fn(async (_message: { to: string; template: "account-created" | "password-reset" | "email-verification"; variables: Record<string,string> }) => {}) };
  return { service: new AuthService(repo, mailer), repo, mailer };
}
describe("authentication business logic", () => {
  it("registers with a salted password hash and sends verification", async () => {
    const { service, repo, mailer } = setup();
    const result = await service.register({ email: "ONE@example.test", displayName: "One", password: "long-secure-password" }, "http://localhost:5173");
    expect(result.user.email).toBe("one@example.test");
    expect(repo.createEmailVerification).toHaveBeenCalledOnce();
    expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({ template: "email-verification" }));
    expect(repo.createUser).toHaveBeenCalledOnce();
    expect(await verifyPassword("long-secure-password", (repo.createUser as any).mock.calls[0][0].passwordHash)).toBe(true);
  });
  it("rejects invalid login and authenticates/revokes sessions", async () => {
    const { service, mailer } = setup();
    await service.register({ email: "one@example.test", displayName: "One", password: "long-secure-password" }, "http://localhost:5173");
    await expect(service.login({ email: "one@example.test", password: "wrong" })).rejects.toMatchObject({ status: 401 });
    await expect(service.login({ email: "one@example.test", password: "long-secure-password" })).rejects.toMatchObject({ status: 403 });
    const verification = new URL(mailer.send.mock.calls[0]![0].variables.verificationUrl!).searchParams.get("verify")!;
    expect(await service.verifyEmail({ token: verification })).toBe(true);
    const login = await service.login({ email: "one@example.test", password: "long-secure-password" });
    expect(await service.authenticate(login.token)).toEqual(user);
    await service.logout(login.token);
    expect(await service.authenticate(login.token)).toBeNull();
  });
  it("issues single use password reset tokens and validates replacement", async () => {
    const { service, mailer } = setup();
    await service.register({ email: "one@example.test", displayName: "One", password: "long-secure-password" }, "http://localhost:5173");
    await service.requestPasswordReset({ email: "one@example.test" }, "http://127.0.0.1:5173");
    const url = mailer.send.mock.calls[1]![0].variables.resetUrl;
    const token = new URL(url!).searchParams.get("token")!;
    expect(tokenHash(token)).not.toBe(token);
    expect(await service.resetPassword({ token, password: "a-new-secure-password" })).toBe(true);
    expect(await service.resetPassword({ token, password: "another-secure-password" })).toBe(false);
  });
  it("checks permissions with super-admin override", () => {
    expect(hasPermission(user, "orders.write")).toBe(false);
    expect(hasPermission({ ...user, permissions: ["orders.write"] }, "orders.write")).toBe(true);
    expect(hasPermission({ ...user, roles: ["super_admin"] }, "staff.manage")).toBe(true);
  });
});
