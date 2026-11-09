import type { ArtVariant } from "./components/ProductArt";

export type GateStatus = "checking" | "required" | "accepted" | "declined" | "unavailable";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
};

export type Product = {
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
  categories: { id: string; name: string; slug: string }[];
  images: { secureUrl: string; publicId: string; altText: string; sortOrder: number }[];
  rating?: number;
  reviewCount?: number;
  badge?: string;
  art?: ArtVariant;
  tone?: string;
};

export type ProductPage = { items: Product[]; total: number; page: number; pageSize: number };

export type Currency = { code: string; minorUnitExponent: number };

export type CartItem = {
  productId: string;
  name: string;
  slug?: string;
  priceMinor: number;
  currencyCode: string;
  stockQuantity: number;
  quantity: number;
  imageUrl: string | null;
  lineTotalMinor?: number;
  art?: ArtVariant;
  tone?: string;
};

export type Cart = {
  items: CartItem[];
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currencyCode: string;
  couponCode?: string | null;
  shippingMethod?: unknown;
};

export type Account = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
};

export type AccountOrder = {
  id: string;
  createdAt: string;
  status: string;
  totalMinor: number;
  currencyCode: string;
  paymentStatus: string;
  itemCount: number;
  shippingMethodName: string | null;
};

export type AdminView = "overview" | "products" | "orders" | "customers" | "coupons";

export type AdminOverview = {
  productCount: number;
  orderCount: number;
  customerCount: number;
  couponCount: number;
  recentOrders: Array<{
    id: string;
    status: string;
    totalMinor: number;
    currencyCode: string;
    createdAt: string;
    itemCount: number;
  }>;
};
