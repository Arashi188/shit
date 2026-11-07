import { createHash, randomBytes } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { AuthService } from "../domain/auth.js";
import { type CartLine, CartRuleError, priceCart } from "../domain/cart.js";
import { createOrderQuote } from "../domain/order.js";
import type { Mailer } from "../integrations/mailer/mailer.js";
import { readCookie } from "../integrations/age-gate/age-gate.js";
import type { PaymentProvider } from "../integrations/payment/payment-provider.js";
import type { PrismaClient } from "../generated/prisma/client.js";

const GUEST_CART_COOKIE = "serein_cart";
const CheckoutInput = z.object({
  shippingMethodId: z.string().uuid().optional(),
  email: z.string().trim().email().optional(),
}).strict();

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

function wrap(handler: (req: any, res: any, next: any) => Promise<void>) {
  return async (req: any, res: any, next: any) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ error: "Invalid checkout request", issues: error.issues });
      }
      if (error instanceof CartRuleError) {
        return void res.status(400).json({ error: error.message });
      }
      next(error);
    }
  };
}

export function createCheckoutRouter(
  prisma: PrismaClient,
  auth: AuthService,
  paymentProvider: PaymentProvider,
  mailer: Mailer,
  secureCookie: boolean,
) {
  const router = Router();

  async function cartFor(req: Request, res: Response) {
    const user = await auth.authenticate(readCookie(req.headers.cookie, "serein_session"));
    if (user) {
      return prisma.cart.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
        include: {
          items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } },
          shippingMethod: true,
        },
      });
    }

    let token = readCookie(req.headers.cookie, GUEST_CART_COOKIE);
    if (!token || token.length > 128) {
      token = randomBytes(32).toString("base64url");
      res.cookie(GUEST_CART_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/api/v1", maxAge: 30 * 86400_000 });
    }

    return prisma.cart.upsert({
      where: { guestTokenHash: digest(token) },
      create: { guestTokenHash: digest(token) },
      update: {},
      include: {
        items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } },
        shippingMethod: true,
      },
    });
  }

  router.post("/checkout", wrap(async (req, res) => {
    const { shippingMethodId, email } = CheckoutInput.parse(req.body ?? {});
    const cart = await cartFor(req, res);
    if (!cart.items.length) {
      return void res.status(400).json({ error: "Your cart is empty" });
    }

    const selectedShippingMethod = shippingMethodId
      ? await prisma.shippingMethod.findFirst({ where: { id: shippingMethodId, isEnabled: true } })
      : cart.shippingMethod;

    if (!selectedShippingMethod) {
      return void res.status(400).json({ error: "Shipping option is unavailable" });
    }

    const lines: CartLine[] = cart.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      slug: item.product.slug,
      priceMinor: item.product.priceMinor,
      currencyCode: item.product.currencyCode,
      stockQuantity: item.product.stockQuantity,
      quantity: item.quantity,
      imageUrl: item.product.images[0]?.secureUrl ?? null,
    }));

    const cartCoupon = cart.couponCode ? await prisma.coupon.findUnique({ where: { code: cart.couponCode } }) : null;
    const quote = createOrderQuote(lines, cartCoupon, selectedShippingMethod);
    if (!quote.currencyCode) {
      return void res.status(400).json({ error: "Your cart does not have a valid currency" });
    }

    const user = await auth.authenticate(readCookie(req.headers.cookie, "serein_session"));
    const order = await prisma.order.create({
      data: {
        userId: user?.id ?? null,
        guestTokenHash: user ? null : digest(randomBytes(32).toString("hex")),
        status: "pending",
        currencyCode: quote.currencyCode,
        subtotalMinor: quote.subtotalMinor,
        discountMinor: quote.discountMinor,
        shippingMinor: quote.shippingMinor,
        totalMinor: quote.totalMinor,
        couponCode: quote.couponCode ?? null,
        shippingMethodId: selectedShippingMethod.id,
        items: {
          create: quote.lines.map((line) => ({
            productId: line.productId,
            name: line.name,
            slug: line.slug,
            priceMinor: line.priceMinor,
            currencyCode: line.currencyCode,
            quantity: line.quantity,
            imageUrl: line.imageUrl,
          })),
        },
      },
      include: { items: true },
    });

    const payment = await paymentProvider.initiate({
      orderId: order.id,
      amount: { amountMinor: quote.totalMinor, currency: quote.currencyCode },
      idempotencyKey: `checkout-${order.id}-${Date.now()}`,
    });

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { paymentReference: payment.reference, paymentStatus: payment.state },
      include: { items: true },
    });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponCode: null, shippingMethodId: null },
    });

    await paymentProvider.verify(payment.reference);
    const recipient = user?.email ?? email ?? "customer@serein.local";
    await mailer.send({
      to: recipient,
      template: "order-confirmation",
      variables: {
        orderId: order.id,
        amount: String(quote.totalMinor),
        currency: quote.currencyCode,
      },
    });

    res.status(201).json({
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      payment: { reference: payment.reference, state: payment.state },
      totals: {
        subtotalMinor: quote.subtotalMinor,
        discountMinor: quote.discountMinor,
        shippingMinor: quote.shippingMinor,
        totalMinor: quote.totalMinor,
        currencyCode: quote.currencyCode,
      },
    });
  }));

  return router;
}
