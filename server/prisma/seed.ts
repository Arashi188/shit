import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client.js";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the database");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const roleDefinitions = [
  { code: "super_admin", name: "Super Admin" },
  { code: "product_manager", name: "Product Manager" },
  { code: "order_manager", name: "Order Manager" },
  { code: "customer_support", name: "Customer Support" },
  { code: "marketing_manager", name: "Marketing Manager" },
  { code: "customer", name: "Customer" },
];
const permissionDefinitions = [
  ["catalog.read", "View catalog"], ["catalog.write", "Manage catalog"],
  ["orders.read", "View orders"], ["orders.write", "Manage orders"],
  ["customers.read", "View customers"], ["customers.write", "Manage customers"],
  ["promotions.write", "Manage promotions"], ["content.write", "Manage content"],
  ["reviews.moderate", "Moderate reviews"], ["staff.manage", "Manage admin users"],
  ["audit.read", "View audit log"],
] as const;
const categoryDefinitions = [
  { name: "Vibrators", slug: "vibrators", description: "Thoughtfully selected personal wellness essentials.", sortOrder: 10 },
  { name: "Wellness", slug: "wellness", description: "Considered pieces for personal care and everyday rituals.", sortOrder: 20 },
  { name: "For two", slug: "for-two", description: "Thoughtful additions for shared moments.", sortOrder: 30 },
  { name: "Care & glide", slug: "care-and-glide", description: "Gentle care and body-safe essentials.", sortOrder: 40 },
  { name: "Accessories", slug: "accessories", description: "Useful details for your routine.", sortOrder: 50 },
];
const sampleProducts = [
  { name: "Luma Wave", slug: "luma-wave", description: "A soft-touch personal wellness essential with quiet, intuitive settings.", shortDescription: "A soft-touch essential, thoughtfully made.", priceMinor: 8900, compareAtMinor: null, stockQuantity: 24, isFeatured: true, categorySlug: "vibrators" },
  { name: "Aura Wand", slug: "aura-wand", description: "A sculptural massage wand for full-body relaxation and mindful routines.", shortDescription: "Sculptural design for full-body relaxation.", priceMinor: 12400, compareAtMinor: null, stockQuantity: 16, isFeatured: true, categorySlug: "wellness" },
  { name: "Silk Touch", slug: "silk-touch", description: "A simple, fragrance-free personal care essential.", shortDescription: "A gentle everyday care essential.", priceMinor: 2600, compareAtMinor: null, stockQuantity: 40, isFeatured: false, categorySlug: "care-and-glide" },
  { name: "The Duo Set", slug: "the-duo-set", description: "A considered pair of essentials, presented in a discreet keepsake box.", shortDescription: "A thoughtful set for shared discovery.", priceMinor: 15900, compareAtMinor: 18900, stockQuantity: 10, isFeatured: true, categorySlug: "for-two" },
];

try {
  for (const role of roleDefinitions) {
    await prisma.role.upsert({ where: { code: role.code }, create: role, update: { name: role.name } });
  }
  for (const [code, name] of permissionDefinitions) {
    await prisma.permission.upsert({ where: { code }, create: { code, name }, update: { name } });
  }
  for (const category of categoryDefinitions) {
    await prisma.category.upsert({ where: { slug: category.slug }, create: category, update: category });
  }
  const currencyValue = process.env.CATALOG_SEED_CURRENCY?.trim().toUpperCase();
  if (currencyValue) {
    const currencyCode = z.string().regex(/^[A-Z]{3}$/).parse(currencyValue);
    const exponent = z.coerce.number().int().min(0).max(4).parse(process.env.CATALOG_SEED_CURRENCY_EXPONENT);
    await prisma.currency.upsert({
      where: { code: currencyCode },
      create: { code: currencyCode, minorUnitExponent: exponent, isEnabled: true },
      update: { minorUnitExponent: exponent, isEnabled: true },
    });
    const brand = await prisma.brand.upsert({
      where: { slug: "serein" }, create: { name: "Serein", slug: "serein" }, update: { name: "Serein" },
    });
    for (const sample of sampleProducts) {
      const { categorySlug, ...productData } = sample;
      const product = await prisma.product.upsert({
        where: { slug: sample.slug },
        create: { ...productData, brandId: brand.id, currencyCode, isPublished: true },
        update: { ...productData, brandId: brand.id, currencyCode, isPublished: true },
      });
      const category = await prisma.category.findUniqueOrThrow({ where: { slug: categorySlug } });
      await prisma.productCategory.upsert({
        where: { productId_categoryId: { productId: product.id, categoryId: category.id } },
        create: { productId: product.id, categoryId: category.id },
        update: {},
      });
    }
  }
  const superAdmin = await prisma.role.findUniqueOrThrow({ where: { code: "super_admin" } });
  const permissions = await prisma.permission.findMany();
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: permission.id } },
      create: { roleId: superAdmin.id, permissionId: permission.id },
      update: {},
    });
  }
} finally {
  await prisma.$disconnect();
}
