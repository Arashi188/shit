import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";

const scrypt = promisify(scryptCallback);
export const RegisterSchema = z.object({ email: z.string().trim().email().max(320), displayName: z.string().trim().min(1).max(120), password: z.string().min(12).max(128) }).strict();
export const LoginSchema = z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(128) }).strict();
export const ForgotPasswordSchema = z.object({ email: z.string().trim().email().max(320) }).strict();
export const ResetPasswordSchema = z.object({ token: z.string().min(32).max(256), password: z.string().min(12).max(128) }).strict();
export type AuthUser = { id: string; email: string; displayName: string; roles: string[]; permissions: string[] };
export type AuthRecord = AuthUser & { passwordHash: string; emailVerifiedAt: Date | null };
export type AuthRepository = {
  createUser(input: { email: string; displayName: string; passwordHash: string; customerRoleCode: string }): Promise<AuthUser>;
  findUserByEmail(email: string): Promise<AuthRecord | null>;
  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findSession(tokenHash: string): Promise<{ user: AuthUser; expiresAt: Date } | null>;
  deleteSession(tokenHash: string): Promise<void>;
  createPasswordReset(email: string, tokenHash: string, expiresAt: Date): Promise<boolean>;
  consumePasswordReset(tokenHash: string, newPasswordHash: string): Promise<boolean>;
  createEmailVerification(email: string, tokenHash: string, expiresAt: Date): Promise<boolean>;
  consumeEmailVerification(tokenHash: string): Promise<boolean>;
};
export type AuthMailer = { send(message: { to: string; template: "account-created" | "password-reset" | "email-verification"; variables: Record<string,string> }): Promise<void> };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = encoded.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex || !/^[a-f\d]+$/i.test(saltHex + keyHex)) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export class AuthError extends Error { constructor(public readonly status: number, message: string) { super(message); } }
export class AuthService {
  constructor(private readonly repo: AuthRepository, private readonly mailer: AuthMailer, private readonly now = () => new Date()) {}
  async register(input: unknown, webOrigin: string): Promise<{ user: AuthUser }> {
    const data = RegisterSchema.parse(input);
    const email = data.email.toLowerCase();
    if (await this.repo.findUserByEmail(email)) throw new AuthError(409, "An account with this email already exists");
    const user = await this.repo.createUser({ email, displayName: data.displayName, passwordHash: await hashPassword(data.password), customerRoleCode: "customer" });
    const token = randomBytes(32).toString("base64url");
    await this.repo.createEmailVerification(user.email, tokenHash(token), new Date(this.now().getTime() + 24 * 3600_000));
    await this.mailer.send({ to: user.email, template: "email-verification", variables: { verificationUrl: `${webOrigin}/?verify=${token}` } });
    return { user };
  }
  async login(input: unknown): Promise<{ user: AuthUser; token: string }> {
    const data = LoginSchema.parse(input);
    const record = await this.repo.findUserByEmail(data.email.toLowerCase());
    if (!record || !(await verifyPassword(data.password, record.passwordHash))) throw new AuthError(401, "Email or password is incorrect");
    if (!record.emailVerifiedAt) throw new AuthError(403, "Verify your email before signing in");
    const token = randomBytes(32).toString("base64url");
    await this.repo.createSession(record.id, tokenHash(token), new Date(this.now().getTime() + 30 * 86400_000));
    const { passwordHash: _secret, ...user } = record;
    return { user, token };
  }
  async authenticate(token: string | undefined): Promise<AuthUser | null> {
    if (!token || token.length > 256) return null;
    const session = await this.repo.findSession(tokenHash(token));
    if (!session || session.expiresAt <= this.now()) { if (session) await this.repo.deleteSession(tokenHash(token)); return null; }
    return session.user;
  }
  async logout(token: string | undefined): Promise<void> { if (token) await this.repo.deleteSession(tokenHash(token)); }
  async requestPasswordReset(input: unknown, baseUrl: string): Promise<void> {
    const { email } = ForgotPasswordSchema.parse(input);
    const token = randomBytes(32).toString("base64url");
    if (await this.repo.createPasswordReset(email.toLowerCase(), tokenHash(token), new Date(this.now().getTime() + 30 * 60_000))) {
      await this.mailer.send({ to: email.toLowerCase(), template: "password-reset", variables: { resetUrl: `${baseUrl}/reset-password?token=${token}` } });
    }
  }
  async resetPassword(input: unknown): Promise<boolean> {
    const { token, password } = ResetPasswordSchema.parse(input);
    return this.repo.consumePasswordReset(tokenHash(token), await hashPassword(password));
  }
  async verifyEmail(input: unknown): Promise<boolean> {
    const { token } = z.object({ token: z.string().min(32).max(256) }).strict().parse(input);
    return this.repo.consumeEmailVerification(tokenHash(token));
  }
  async resendVerification(input: unknown, webOrigin: string): Promise<void> {
    const { email } = ForgotPasswordSchema.parse(input);
    const token = randomBytes(32).toString("base64url");
    if (await this.repo.createEmailVerification(email.toLowerCase(), tokenHash(token), new Date(this.now().getTime() + 24 * 3600_000))) {
      await this.mailer.send({ to: email.toLowerCase(), template: "email-verification", variables: { verificationUrl: `${webOrigin}/?verify=${token}` } });
    }
  }
}

export function hasPermission(user: AuthUser | undefined, permission: string): boolean {
  return Boolean(user && (user.roles.includes("super_admin") || user.permissions.includes(permission)));
}
