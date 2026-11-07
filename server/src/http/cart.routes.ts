import { createHash, randomBytes } from "node:crypto";
import { Router, type Request, type RequestHandler, type Response } from "express";
import { ZodError } from "zod";
import type { PrismaClient } from "../generated/prisma/client.js";
import { AuthService } from "../domain/auth.js";
import { assertStock, CartItemInput, CartQuantityInput, CartRuleError, CouponInput, priceCart, ShippingInput } from "../domain/cart.js";
import type { AgeGate } from "../integrations/age-gate/age-gate.js";
import { readCookie } from "../integrations/age-gate/age-gate.js";
import { requireAgeVerified } from "../integrations/age-gate/require-age-verified.js";

const GUEST_COOKIE = "serein_cart";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function errors(handler: RequestHandler): RequestHandler { return async (req, res, next) => { try { await handler(req, res, next); } catch (error) { if (error instanceof ZodError) return void res.status(400).json({ error: "Invalid cart request", issues: error.issues }); if (error instanceof CartRuleError) return void res.status(400).json({ error: error.message }); if ((error as any)?.code === "P2002") return next(error); next(error); } }; }

export function createCartRouter(prisma: PrismaClient, auth: AuthService, ageGate: AgeGate, secureCookie: boolean) {
  const router = Router();
  router.use(requireAgeVerified(ageGate));
  async function cartFor(req: Request, res: Response) {
    const user = await auth.authenticate(readCookie(req.headers.cookie, "serein_session"));
    if (user) return prisma.cart.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {}, include: { items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } }, shippingMethod: true } });
    let token = readCookie(req.headers.cookie, GUEST_COOKIE);
    if (!token || token.length > 128) { token = randomBytes(32).toString("base64url"); res.cookie(GUEST_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/api/v1", maxAge: 30 * 86400_000 }); }
    return prisma.cart.upsert({ where: { guestTokenHash: digest(token) }, create: { guestTokenHash: digest(token) }, update: {}, include: { items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } }, shippingMethod: true } });
  }
  async function view(req: Request, res: Response) {
    const cart = await cartFor(req, res);
    const lines = cart.items.map((item) => ({ productId: item.productId, name: item.product.name, slug: item.product.slug, priceMinor: item.product.priceMinor, currencyCode: item.product.currencyCode, stockQuantity: item.product.stockQuantity, quantity: item.quantity, imageUrl: item.product.images[0]?.secureUrl ?? null }));
    const coupon = cart.couponCode ? await prisma.coupon.findUnique({ where: { code: cart.couponCode } }) : null;
    const totals = priceCart(lines, coupon, cart.shippingMethod);
    return { ...totals, items: lines.map((line) => ({ ...line, lineTotalMinor: line.priceMinor * line.quantity })), shippingMethod: cart.shippingMethod };
  }
  router.get("/cart", errors(async (req, res) => res.json(await view(req, res))));
  router.post("/cart/items", errors(async (req, res) => {
    const { productId, quantity } = CartItemInput.parse(req.body); const cart = await cartFor(req, res);
    const product = await prisma.product.findFirst({ where: { id: productId, isPublished: true, deletedAt: null, currency: { isEnabled: true } } });
    if (!product) return void res.status(404).json({ error: "Product is unavailable" });
    const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
    const nextQuantity = (existing?.quantity ?? 0) + quantity; assertStock(nextQuantity, product.stockQuantity);
    if (cart.items.length && cart.items.some((item) => item.product.currencyCode !== product.currencyCode)) return void res.status(400).json({ error: "A cart can contain products in one currency only" });
    await prisma.cartItem.upsert({ where: { cartId_productId: { cartId: cart.id, productId } }, create: { cartId: cart.id, productId, quantity }, update: { quantity: nextQuantity } });
    res.status(200).json(await view(req, res));
  }));
  router.patch("/cart/items/:productId", errors(async (req, res) => {
    const { quantity } = CartQuantityInput.parse(req.body); const cart = await cartFor(req, res);
    const productId = String(req.params.productId ?? "");
    const item = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } }, include: { product: true } });
    if (!item) return void res.status(404).json({ error: "Cart item not found" });
    if (quantity === 0) await prisma.cartItem.delete({ where: { id: item.id } });
    else { assertStock(quantity, item.product.stockQuantity); await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } }); }
    res.json(await view(req, res));
  }));
  router.delete("/cart/items/:productId", errors(async (req, res) => { const cart = await cartFor(req, res); await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId: String(req.params.productId ?? "") } }); res.json(await view(req, res)); }));
  router.post("/cart/coupon", errors(async (req, res) => { const { code } = CouponInput.parse(req.body); const cart = await cartFor(req, res); const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } }); if (!coupon) return void res.status(400).json({ error: "Discount code is not valid" }); await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: coupon.code } }); res.json(await view(req, res)); }));
  router.delete("/cart/coupon", errors(async (req, res) => { const cart = await cartFor(req, res); await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } }); res.json(await view(req, res)); }));
  router.get("/shipping-methods", errors(async (req, res) => { const currencyCode = String(req.query.currency ?? "").toUpperCase(); const countryCode = typeof req.query.country === "string" ? req.query.country.toUpperCase() : undefined; const items = await prisma.shippingMethod.findMany({ where: { isEnabled: true, currencyCode, OR: [{ countryCode: null }, ...(countryCode ? [{ countryCode }] : [])] }, orderBy: { feeMinor: "asc" } }); res.json({ items }); }));
  router.put("/cart/shipping", errors(async (req, res) => { const { shippingMethodId } = ShippingInput.parse(req.body); const cart = await cartFor(req, res); const method = await prisma.shippingMethod.findFirst({ where: { id: shippingMethodId, isEnabled: true } }); if (!method) return void res.status(400).json({ error: "Shipping option is unavailable" }); const currency = cart.items[0]?.product.currencyCode; if (currency && currency !== method.currencyCode) return void res.status(400).json({ error: "Shipping currency does not match the cart" }); await prisma.cart.update({ where: { id: cart.id }, data: { shippingMethodId } }); res.json(await view(req, res)); }));
  return router;
}
