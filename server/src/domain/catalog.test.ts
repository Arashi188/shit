import { describe, expect, it, vi } from "vitest";
import { CatalogNotFoundError, CatalogQuerySchema, CatalogService, type CatalogRepository } from "./catalog.js";
import { buildProductOrderBy, buildProductWhere } from "../data/prisma-catalog.repository.js";

const repository: CatalogRepository = {
  listProducts: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 12 })),
  findProduct: vi.fn(async () => null),
  listCategories: vi.fn(async () => []),
  listCurrencies: vi.fn(async () => []),
};

describe("catalog query and pricing-safe sorting", () => {
  it("normalizes a search and applies bounded pagination defaults", async () => {
    const service = new CatalogService(repository);
    await service.listProducts({ q: "  Silk  ", page: "2" });
    expect(repository.listProducts).toHaveBeenLastCalledWith(expect.objectContaining({ q: "Silk", page: 2, pageSize: 12, sort: "featured" }));
  });

  it("rejects malformed slugs, oversized pages, unknown fields, and price sorting without an explicit currency", () => {
    expect(CatalogQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(CatalogQuerySchema.safeParse({ extra: "value" }).success).toBe(false);
    expect(CatalogQuerySchema.safeParse({ sort: "price_asc" }).success).toBe(false);
    expect(CatalogQuerySchema.safeParse({ sort: "price_desc", currency: "EUR" }).success).toBe(true);
    expect(CatalogQuerySchema.safeParse({ minPriceMinor: "100" }).success).toBe(false);
    expect(CatalogQuerySchema.safeParse({ minPriceMinor: "200", maxPriceMinor: "100", currency: "EUR" }).success).toBe(false);
  });

  it("keeps public results published, active, and in enabled currencies", () => {
    const query = CatalogQuerySchema.parse({ q: "silk", category: "care-and-glide", currency: "ABC", inStock: "true", minPriceMinor: "1000", maxPriceMinor: "5000" });
    const where = buildProductWhere(query);
    expect(where.AND).toContainEqual({ isPublished: true });
    expect(where.AND).toContainEqual({ deletedAt: null });
    expect(where.AND).toContainEqual({ currency: { is: { isEnabled: true } } });
    expect(where.AND).toContainEqual({ currencyCode: "ABC" });
    expect(where.AND).toContainEqual({ stockQuantity: { gt: 0 } });
    expect(where.AND).toContainEqual({ currencyCode: "ABC" });
    expect(JSON.stringify(where)).toContain("care-and-glide");
    expect(JSON.stringify(where)).toContain("silk");
  });

  it("sorts by minor units only within a selected currency", () => {
    const query = CatalogQuerySchema.parse({ sort: "price_asc", currency: "ABC" });
    expect(buildProductOrderBy(query)[0]).toEqual({ priceMinor: "asc" });
  });

  it("returns a specific missing-product error for the API layer", async () => {
    const service = new CatalogService(repository);
    await expect(service.getProduct("missing-product")).rejects.toBeInstanceOf(CatalogNotFoundError);
    await expect(service.getProduct("Not a slug")).rejects.toThrow();
  });
});
