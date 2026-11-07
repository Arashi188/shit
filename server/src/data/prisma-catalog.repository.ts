import type { PrismaClient, Prisma } from "../generated/prisma/client.js";
import type { CatalogProduct, CatalogQuery, CatalogRepository, ProductPage, PublicCategory } from "../domain/catalog.js";

export function buildProductWhere(query: CatalogQuery): Prisma.ProductWhereInput {
  const clauses: Prisma.ProductWhereInput[] = [
    { isPublished: true },
    { deletedAt: null },
    { currency: { is: { isEnabled: true } } },
  ];
  if (query.q) {
    clauses.push({ OR: [
      { name: { contains: query.q, mode: "insensitive" } },
      { shortDescription: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
      { brand: { is: { name: { contains: query.q, mode: "insensitive" }, deletedAt: null } } },
    ] });
  }
  if (query.category) {
    clauses.push({ categories: { some: { category: { slug: query.category, isVisible: true, deletedAt: null } } } });
  }
  if (query.currency) clauses.push({ currencyCode: query.currency });
  if (query.inStock) clauses.push({ stockQuantity: { gt: 0 } });
  if (query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined) {
    clauses.push({ priceMinor: {
      ...(query.minPriceMinor !== undefined ? { gte: query.minPriceMinor } : {}),
      ...(query.maxPriceMinor !== undefined ? { lte: query.maxPriceMinor } : {}),
    } });
  }
  return { AND: clauses };
}

export function buildProductOrderBy(query: CatalogQuery): Prisma.ProductOrderByWithRelationInput[] {
  if (query.sort === "newest") return [{ createdAt: "desc" }, { id: "asc" }];
  if (query.sort === "price_asc") return [{ priceMinor: "asc" }, { id: "asc" }];
  if (query.sort === "price_desc") return [{ priceMinor: "desc" }, { id: "asc" }];
  return [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }];
}

const publicProductSelect = {
  id: true, name: true, slug: true, shortDescription: true, description: true,
  priceMinor: true, compareAtMinor: true, currencyCode: true, stockQuantity: true, isFeatured: true,
  currency: { select: { minorUnitExponent: true } },
  brand: { select: { name: true, slug: true } },
  categories: {
    where: { category: { isVisible: true, deletedAt: null } },
    orderBy: { sortOrder: "asc" },
    select: { category: { select: { id: true, name: true, slug: true } } },
  },
  images: { orderBy: { sortOrder: "asc" }, select: { secureUrl: true, publicId: true, altText: true, sortOrder: true } },
} satisfies Prisma.ProductSelect;

function mapProduct(record: Prisma.ProductGetPayload<{ select: typeof publicProductSelect }>): CatalogProduct {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    shortDescription: record.shortDescription,
    description: record.description,
    priceMinor: record.priceMinor,
    compareAtMinor: record.compareAtMinor,
    currencyCode: record.currencyCode.trim(),
    currencyExponent: record.currency.minorUnitExponent,
    stockQuantity: record.stockQuantity,
    isFeatured: record.isFeatured,
    brand: record.brand,
    categories: record.categories.map((assignment) => assignment.category),
    images: record.images,
  };
}

export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listProducts(query: CatalogQuery): Promise<ProductPage> {
    const where = buildProductWhere(query);
    const [records, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: publicProductSelect,
        orderBy: buildProductOrderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items: records.map(mapProduct), total, page: query.page, pageSize: query.pageSize };
  }

  async findProduct(slug: string): Promise<CatalogProduct | null> {
    const record = await this.prisma.product.findFirst({
      where: { slug, isPublished: true, deletedAt: null },
      select: publicProductSelect,
    });
    return record ? mapProduct(record) : null;
  }

  async listCategories(): Promise<PublicCategory[]> {
    return this.prisma.category.findMany({
      where: { isVisible: true, deletedAt: null },
      select: { id: true, name: true, slug: true, description: true, imageUrl: true, parentId: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async listCurrencies() {
    const rows = await this.prisma.currency.findMany({
      where: { isEnabled: true },
      select: { code: true, minorUnitExponent: true },
      orderBy: { code: "asc" },
    });
    return rows.map((row) => ({ ...row, code: row.code.trim() }));
  }
}
