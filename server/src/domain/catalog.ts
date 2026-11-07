import { z } from "zod";

const slugSchema = z.string().trim().min(1).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const CatalogQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: slugSchema.optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  minPriceMinor: z.coerce.number().int().min(0).optional(),
  maxPriceMinor: z.coerce.number().int().min(0).optional(),
  sort: z.enum(["featured", "newest", "price_asc", "price_desc"]).default("featured"),
  inStock: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
}).strict().superRefine((query, context) => {
  if ((query.sort === "price_asc" || query.sort === "price_desc") && !query.currency) {
    context.addIssue({ code: "custom", path: ["currency"], message: "Choose a currency when sorting by price" });
  }
  if ((query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined) && !query.currency) {
    context.addIssue({ code: "custom", path: ["currency"], message: "Choose a currency when filtering by price" });
  }
  if (query.minPriceMinor !== undefined && query.maxPriceMinor !== undefined && query.minPriceMinor > query.maxPriceMinor) {
    context.addIssue({ code: "custom", path: ["maxPriceMinor"], message: "Maximum price must be at least the minimum price" });
  }
});

export const ProductSlugSchema = slugSchema;
export type CatalogQuery = z.infer<typeof CatalogQuerySchema>;

export type CatalogImage = { secureUrl: string; publicId: string; altText: string; sortOrder: number };
export type CatalogCategory = { id: string; name: string; slug: string };
export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string;
  priceMinor: number;
  compareAtMinor: number | null;
  currencyCode: string;
  currencyExponent: number;
  stockQuantity: number;
  isFeatured: boolean;
  brand: { name: string; slug: string } | null;
  categories: CatalogCategory[];
  images: CatalogImage[];
};

export type ProductPage = { items: CatalogProduct[]; total: number; page: number; pageSize: number };
export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
};
export type CatalogCurrency = { code: string; minorUnitExponent: number };

export interface CatalogRepository {
  listProducts(query: CatalogQuery): Promise<ProductPage>;
  findProduct(slug: string): Promise<CatalogProduct | null>;
  listCategories(): Promise<PublicCategory[]>;
  listCurrencies(): Promise<CatalogCurrency[]>;
}

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  listProducts(input: unknown): Promise<ProductPage> {
    return this.repository.listProducts(CatalogQuerySchema.parse(input));
  }

  async getProduct(input: unknown): Promise<CatalogProduct> {
    const slug = ProductSlugSchema.parse(input);
    const product = await this.repository.findProduct(slug);
    if (!product) throw new CatalogNotFoundError();
    return product;
  }

  listCategories(): Promise<PublicCategory[]> {
    return this.repository.listCategories();
  }

  listCurrencies(): Promise<CatalogCurrency[]> {
    return this.repository.listCurrencies();
  }
}

export class CatalogNotFoundError extends Error {
  constructor() { super("Catalog item not found"); }
}
