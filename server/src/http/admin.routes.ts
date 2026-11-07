import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuthenticated, requirePermission } from "./auth.routes.js";
import { hasPermission } from "../domain/auth.js";
import { transitionOrderState, type OrderStatus } from "../domain/order.js";
import type { PrismaClient } from "../generated/prisma/client.js";

const productWriteSchema = z.object({
  name: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(5000),
  shortDescription: z.string().trim().max(360).nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  priceMinor: z.number().int().min(0),
  compareAtMinor: z.number().int().min(0).nullable().optional(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  stockQuantity: z.number().int().min(0).max(1_000_000).default(0),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  categoryIds: z.array(z.string().uuid()).default([]),
}).strict();

const orderStatusSchema = z.object({ status: z.enum(["pending", "paid", "processing", "shipped", "completed", "cancelled", "refunded"]) }).strict();

const couponSchema = z.object({
  code: z.string().trim().min(1).max(40),
  percentOff: z.number().int().min(0).max(100).nullable().optional(),
  amountOffMinor: z.number().int().min(0).nullable().optional(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  minimumSubtotalMinor: z.number().int().min(0).default(0),
  usageLimit: z.number().int().min(1).nullable().optional(),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isEnabled: z.boolean().default(true),
}).strict();

function toDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readStringParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

export function createAdminRouter(prisma: PrismaClient) {
  const router = Router();

  router.get("/admin/overview", requireAuthenticated, async (req: Request, res: Response) => {
    const user = (req as any).authUser;
    if (!hasPermission(user, "catalog.read") && !hasPermission(user, "orders.read") && !hasPermission(user, "customers.read")) {
      return void res.status(403).json({ error: "Insufficient permission" });
    }

    const [productCount, orderCount, customerCount, couponCount, recentOrders] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.order.count(),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.coupon.count(),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { items: { select: { quantity: true } } },
      }),
    ]);

    res.json({
      productCount,
      orderCount,
      customerCount,
      couponCount,
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        status: order.status,
        totalMinor: order.totalMinor,
        currencyCode: order.currencyCode,
        createdAt: order.createdAt,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
    });
  });

  router.get("/admin/products", requireAuthenticated, requirePermission("catalog.read"), async (_req: Request, res: Response) => {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: {
        brand: { select: { name: true } },
        categories: { include: { category: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });
    res.json({ items: products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      priceMinor: product.priceMinor,
      currencyCode: product.currencyCode,
      stockQuantity: product.stockQuantity,
      isPublished: product.isPublished,
      isFeatured: product.isFeatured,
      brandName: product.brand?.name ?? null,
      categories: product.categories.map((entry) => ({ id: entry.category.id, name: entry.category.name })),
      imageUrl: product.images[0]?.secureUrl ?? null,
      createdAt: product.createdAt,
    })) });
  });

  router.post("/admin/products", requireAuthenticated, requirePermission("catalog.write"), async (req: Request, res: Response) => {
    const body = productWriteSchema.parse(req.body ?? {});
    const productInput: Record<string, unknown> = {
      name: body.name,
      slug: body.slug ?? body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: body.description,
      shortDescription: body.shortDescription ?? null,
      brandId: body.brandId ?? null,
      priceMinor: body.priceMinor,
      compareAtMinor: body.compareAtMinor ?? null,
      currencyCode: body.currencyCode,
      stockQuantity: body.stockQuantity,
      isFeatured: body.isFeatured,
      isPublished: body.isPublished,
    };
    if (body.categoryIds.length) {
      (productInput as any).categories = { create: body.categoryIds.map((categoryId) => ({ category: { connect: { id: categoryId } } })) };
    }
    const created = await prisma.product.create({ data: productInput as any });
    res.status(201).json({ id: created.id, slug: created.slug });
  });

  router.patch("/admin/products/:id", requireAuthenticated, requirePermission("catalog.write"), async (req: Request, res: Response) => {
    const productId = readStringParam(req.params.id);
    if (!productId) {
      return void res.status(400).json({ error: "Missing product id" });
    }

    const update = productWriteSchema.partial().parse(req.body ?? {});
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(update.name ? { name: update.name } : {}),
        ...(update.slug ? { slug: update.slug } : {}),
        ...(update.description ? { description: update.description } : {}),
        ...(update.shortDescription !== undefined ? { shortDescription: update.shortDescription } : {}),
        ...(update.brandId !== undefined ? { brandId: update.brandId ?? null } : {}),
        ...(update.priceMinor !== undefined ? { priceMinor: update.priceMinor } : {}),
        ...(update.compareAtMinor !== undefined ? { compareAtMinor: update.compareAtMinor ?? null } : {}),
        ...(update.currencyCode ? { currencyCode: update.currencyCode } : {}),
        ...(update.stockQuantity !== undefined ? { stockQuantity: update.stockQuantity } : {}),
        ...(update.isFeatured !== undefined ? { isFeatured: update.isFeatured } : {}),
        ...(update.isPublished !== undefined ? { isPublished: update.isPublished } : {}),
      },
    });
    if (update.categoryIds) {
      await prisma.productCategory.deleteMany({ where: { productId: product.id } });
      if (update.categoryIds.length) {
        await prisma.productCategory.createMany({
          data: update.categoryIds.map((categoryId) => ({ productId: product.id, categoryId })),
        });
      }
    }
    res.json({ id: product.id, slug: product.slug });
  });

  router.get("/admin/orders", requireAuthenticated, requirePermission("orders.read"), async (_req: Request, res: Response) => {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, displayName: true } },
        items: { select: { name: true, quantity: true, priceMinor: true, currencyCode: true } },
      },
    });
    res.json({ items: orders.map((order) => ({
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus ?? "pending",
      totalMinor: order.totalMinor,
      currencyCode: order.currencyCode,
      customer: order.user ? { email: order.user.email, displayName: order.user.displayName } : null,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: order.createdAt,
    })) });
  });

  router.patch("/admin/orders/:id/status", requireAuthenticated, requirePermission("orders.write"), async (req: Request, res: Response) => {
    const orderId = readStringParam(req.params.id);
    if (!orderId) {
      return void res.status(400).json({ error: "Missing order id" });
    }

    const { status } = orderStatusSchema.parse(req.body ?? {});
    const current = await prisma.order.findUnique({ where: { id: orderId } });
    if (!current) return void res.status(404).json({ error: "Order not found" });
    const next = transitionOrderState(current.status as OrderStatus, status);
    const order = await prisma.order.update({ where: { id: orderId }, data: { status: next } });
    res.json({ id: order.id, status: order.status });
  });

  router.get("/admin/customers", requireAuthenticated, requirePermission("customers.read"), async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, displayName: true, emailVerifiedAt: true, createdAt: true, roleAssignments: { include: { role: { select: { code: true } } } } },
    });
    res.json({ items: users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerified: Boolean(user.emailVerifiedAt),
      roles: user.roleAssignments.map((assignment) => assignment.role.code),
      createdAt: user.createdAt,
    })) });
  });

  router.get("/admin/coupons", requireAuthenticated, requirePermission("promotions.write"), async (_req: Request, res: Response) => {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ items: coupons.map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      percentOff: coupon.percentOff,
      amountOffMinor: coupon.amountOffMinor,
      currencyCode: coupon.currencyCode,
      minimumSubtotalMinor: coupon.minimumSubtotalMinor,
      usageLimit: coupon.usageLimit,
      usedCount: coupon.usedCount,
      isEnabled: coupon.isEnabled,
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
    })) });
  });

  router.post("/admin/coupons", requireAuthenticated, requirePermission("promotions.write"), async (req: Request, res: Response) => {
    const body = couponSchema.parse(req.body ?? {});
    const coupon = await prisma.coupon.create({
      data: {
        code: body.code.toUpperCase(),
        percentOff: body.percentOff ?? null,
        amountOffMinor: body.amountOffMinor ?? null,
        currencyCode: body.currencyCode ?? null,
        minimumSubtotalMinor: body.minimumSubtotalMinor,
        usageLimit: body.usageLimit ?? null,
        startsAt: toDateOrNull(body.startsAt ?? null),
        expiresAt: toDateOrNull(body.expiresAt ?? null),
        isEnabled: body.isEnabled,
      },
    });
    res.status(201).json({ id: coupon.id, code: coupon.code });
  });

  return router;
}
