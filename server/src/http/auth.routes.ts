import { Router, type RequestHandler } from "express";
import { ZodError } from "zod";
import type { PrismaClient } from "../generated/prisma/client.js";
import { AuthError, AuthService, hasPermission } from "../domain/auth.js";
import { readCookie } from "../integrations/age-gate/age-gate.js";

export const SESSION_COOKIE = "serein_session";
function wrap(handler: RequestHandler): RequestHandler { return async (req, res, next) => { try { await handler(req, res, next); } catch (error) { if (error instanceof ZodError) return void res.status(400).json({ error: "Invalid request", issues: error.issues }); if (error instanceof AuthError) return void res.status(error.status).json({ error: error.message }); next(error); } }; }
export function createAuthRouter(service: AuthService, secureCookie: boolean, webOrigin: string, prisma?: PrismaClient) {
  const router = Router();
  const setSession = (res: any, token: string) => res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/api/v1", maxAge: 30 * 86400_000 });
  router.post("/auth/register", wrap(async (req, res) => { const result = await service.register(req.body, webOrigin); res.status(201).json({ user: result.user, message: "Check your email to verify your account." }); }));
  router.post("/auth/login", wrap(async (req, res) => { const result = await service.login(req.body); setSession(res, result.token); res.status(200).json({ user: result.user }); }));
  router.post("/auth/logout", wrap(async (req, res) => { await service.logout(readCookie(req.headers.cookie, SESSION_COOKIE)); res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/api/v1" }); res.status(204).end(); }));
  router.get("/auth/me", wrap(async (req, res) => { const user = await service.authenticate(readCookie(req.headers.cookie, SESSION_COOKIE)); if (!user) return void res.status(401).json({ error: "Authentication required" }); res.json({ user }); }));
  router.get("/auth/account", wrap(async (req, res) => {
    const user = await service.authenticate(readCookie(req.headers.cookie, SESSION_COOKIE));
    if (!user) return void res.status(401).json({ error: "Authentication required" });
    if (!prisma) return void res.json({ user, orders: [] });
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { shippingMethod: { select: { name: true } }, items: { select: { name: true, quantity: true, priceMinor: true, currencyCode: true, imageUrl: true } } },
    });
    res.json({
      user,
      orders: orders.map((order) => ({
        id: order.id,
        createdAt: order.createdAt,
        status: order.status,
        totalMinor: order.totalMinor,
        currencyCode: order.currencyCode,
        paymentStatus: order.paymentStatus ?? "pending",
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        shippingMethodName: order.shippingMethod?.name ?? null,
      })),
    });
  }));
  router.post("/auth/password/forgot", wrap(async (req, res) => { await service.requestPasswordReset(req.body, webOrigin); res.status(202).json({ message: "If the account exists, password reset instructions have been sent." }); }));
  router.post("/auth/password/reset", wrap(async (req, res) => { const ok = await service.resetPassword(req.body); res.status(ok ? 200 : 400).json(ok ? { message: "Password updated. Please sign in again." } : { error: "Reset link is invalid or expired" }); }));
  router.post("/auth/email/verify", wrap(async (req, res) => { const ok = await service.verifyEmail(req.body); res.status(ok ? 200 : 400).json(ok ? { message: "Email verified" } : { error: "Verification link is invalid or expired" }); }));
  router.post("/auth/email/resend", wrap(async (req, res) => { await service.resendVerification(req.body, webOrigin); res.status(202).json({ message: "If the account needs verification, a link has been sent." }); }));
  return router;
}
export function requireAuthenticated(service: AuthService): RequestHandler { return async (req, res, next) => { const user = await service.authenticate(readCookie(req.headers.cookie, SESSION_COOKIE)); if (!user) return void res.status(401).json({ error: "Authentication required" }); (req as any).authUser = user; next(); }; }
export function requirePermission(permission: string): RequestHandler { return (req, res, next) => hasPermission((req as any).authUser, permission) ? next() : void res.status((req as any).authUser ? 403 : 401).json({ error: "Insufficient permission" }); }
