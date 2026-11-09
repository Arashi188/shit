/// <reference types="vite/client" />

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AgeGate } from "./components/AgeGate";
import { AuthScreen } from "./components/AuthScreen";
import { CartDrawer } from "./components/CartDrawer";
import { CatalogSection } from "./components/CatalogSection";
import { HomePage } from "./components/HomePage";
import { ProductDetailView } from "./components/ProductDetailView";
import { StoreFooter } from "./components/StoreFooter";
import { StoreHeader } from "./components/StoreHeader";
import { Icon } from "./components/Icons";
import { demoCategories, demoCurrencies, demoProductBySlug, demoProducts } from "./data/demo";
import { formatDate, formatMoney } from "./lib/format";
import type {
  Account,
  AccountOrder,
  AdminOverview,
  AdminView,
  Cart,
  CartItem,
  Category,
  Currency,
  GateStatus,
  Product,
  ProductPage,
} from "./types";

type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  priceMinor: number;
  currencyCode: string;
  stockQuantity: number;
  isPublished: boolean;
  isFeatured: boolean;
  brandName: string | null;
  categories: Array<{ id: string; name: string }>;
  imageUrl: string | null;
  createdAt: string;
};
type AdminOrderRow = {
  id: string;
  status: string;
  paymentStatus: string;
  totalMinor: number;
  currencyCode: string;
  customer: { email: string; displayName: string } | null;
  itemCount: number;
  createdAt: string;
};
type AdminCustomerRow = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  roles: string[];
  createdAt: string;
};
type AdminCouponRow = {
  id: string;
  code: string;
  percentOff: number | null;
  amountOffMinor: number | null;
  currencyCode: string | null;
  minimumSubtotalMinor: number;
  usageLimit: number | null;
  usedCount: number;
  isEnabled: boolean;
  startsAt: string | null;
  expiresAt: string | null;
};

const PAGE_SIZE = 12;
const FREE_DELIVERY_MINOR = 4000;
const DELIVERY_FEE_MINOR = 395;

function parseMinorInput(value: string, exponent: number): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const pattern = exponent === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{1,${exponent}})?$`);
  if (!pattern.test(normalized)) throw new Error(`Enter a price using at most ${exponent} decimal places.`);
  const [whole, fractional = ""] = normalized.split(".");
  return Number(whole) * 10 ** exponent + Number((fractional + "0".repeat(exponent)).slice(0, exponent) || "0");
}

async function api(path: string): Promise<Response> {
  return fetch(`/api/v1${path}`, { credentials: "same-origin" });
}

async function requestGate(path: "status" | "accept" | "decline", body?: unknown): Promise<Response> {
  const options: RequestInit = { method: path === "status" ? "GET" : "POST", credentials: "same-origin" };
  if (body) {
    options.headers = { "content-type": "application/json" };
    options.body = JSON.stringify(body);
  }
  return fetch(`/api/v1/age-gate/${path}`, options);
}

type DemoQuery = {
  query: string;
  categorySlug: string;
  currencyCode: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  inStockOnly: boolean;
  sort: string;
  page: number;
};

function demoPage(input: DemoQuery): ProductPage {
  let items = [...demoProducts];
  if (input.query) {
    const needle = input.query.toLowerCase();
    items = items.filter((product) =>
      [product.name, product.shortDescription ?? "", product.description, product.brand?.name ?? "", ...product.categories.map((category) => category.name)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }
  if (input.categorySlug) {
    items = items.filter((product) => product.categories.some((category) => category.slug === input.categorySlug));
  }
  if (input.currencyCode) items = items.filter((product) => product.currencyCode === input.currencyCode);
  if (input.minPriceMinor !== undefined) items = items.filter((product) => product.priceMinor >= input.minPriceMinor!);
  if (input.maxPriceMinor !== undefined) items = items.filter((product) => product.priceMinor <= input.maxPriceMinor!);
  if (input.inStockOnly) items = items.filter((product) => product.stockQuantity > 0);

  if (input.sort === "price_asc") items.sort((a, b) => a.priceMinor - b.priceMinor);
  else if (input.sort === "price_desc") items.sort((a, b) => b.priceMinor - a.priceMinor);
  else if (input.sort === "newest") items.sort((a, b) => Number(b.badge?.toLowerCase() === "new") - Number(a.badge?.toLowerCase() === "new"));
  else items.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));

  const total = items.length;
  const start = (input.page - 1) * PAGE_SIZE;
  return { items: items.slice(start, start + PAGE_SIZE), total, page: input.page, pageSize: PAGE_SIZE };
}

function buildDemoCart(items: CartItem[], couponCode: string | null): Cart {
  const subtotal = items.reduce((sum, item) => sum + item.priceMinor * item.quantity, 0);
  let discount = 0;
  if (couponCode === "SEREIN10") discount = Math.round(subtotal * 0.1);
  if (couponCode === "WELCOME15") discount = Math.round(subtotal * 0.15);
  const shipping = items.length === 0 ? 0 : subtotal - discount >= FREE_DELIVERY_MINOR ? 0 : DELIVERY_FEE_MINOR;
  const total = Math.max(0, subtotal - discount + shipping);
  return {
    items: items.map((item) => ({ ...item, lineTotalMinor: item.priceMinor * item.quantity })),
    subtotalMinor: subtotal,
    discountMinor: discount,
    shippingMinor: shipping,
    totalMinor: total,
    currencyCode: "GBP",
    couponCode,
  };
}

export function App() {
  const [status, setStatus] = useState<GateStatus>("checking");
  const [confirmedAdult, setConfirmedAdult] = useState(false);
  const [gateError, setGateError] = useState("");
  const [offlinePreview, setOfflinePreview] = useState(false);

  const [categories, setCategories] = useState<Category[]>(demoCategories);
  const [currencies, setCurrencies] = useState<Currency[]>(demoCurrencies);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [searchText, setSearchText] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [currencyCode, setCurrencyCode] = useState("GBP");
  const [sort, setSort] = useState("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPriceText, setMinPriceText] = useState("");
  const [maxPriceText, setMaxPriceText] = useState("");
  const [minPriceMinor, setMinPriceMinor] = useState<number | undefined>();
  const [maxPriceMinor, setMaxPriceMinor] = useState<number | undefined>();
  const [filterError, setFilterError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "error">("loading");
  const [catalogError, setCatalogError] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productState, setProductState] = useState<"idle" | "loading" | "error">("idle");
  const [productError, setProductError] = useState("");

  const [authMode, setAuthMode] = useState<"login" | "register" | "verify" | null>(null);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [accountView, setAccountView] = useState(false);
  const [accountOrders, setAccountOrders] = useState<AccountOrder[]>([]);

  const [adminView, setAdminView] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminView>("overview");
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [adminProducts, setAdminProducts] = useState<AdminProductRow[]>([]);
  const [adminOrders, setAdminOrders] = useState<AdminOrderRow[]>([]);
  const [adminCustomers, setAdminCustomers] = useState<AdminCustomerRow[]>([]);
  const [adminCoupons, setAdminCoupons] = useState<AdminCouponRow[]>([]);
  const [adminError, setAdminError] = useState("");

  const [cart, setCart] = useState<Cart | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartError, setCartError] = useState("");
  const [cartBusy, setCartBusy] = useState(false);
  const [couponText, setCouponText] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("serein-wishlist") ?? "[]");
      return new Set(Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string") : []);
    } catch {
      return new Set();
    }
  });

  const verifyToken = new URLSearchParams(window.location.search).get("verify") ?? "";
  const canAccessAdmin = Boolean(
    account &&
      (account.roles.includes("super_admin") ||
        account.permissions.some((permission) =>
          ["catalog", "orders", "customers", "promotions", "content", "audit"].some((scope) => permission.includes(scope)),
        )),
  );

  const scrollToShop = useCallback(() => {
    window.setTimeout(() => {
      document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("verify");
    if (token) {
      setAuthMode("verify");
      setAuthMessage("Your email verification link is ready.");
    }
    void fetch("/api/v1/auth/me", { credentials: "same-origin" })
      .then(async (response) => {
        if (response.ok) {
          const result = await response.json();
          setAccount(result.user);
        }
      })
      .catch(() => {});
  }, []);

  const loadAdminData = useCallback(
    async (section: AdminView) => {
      if (!account || !canAccessAdmin) return;
      try {
        setAdminError("");
        if (section === "overview") {
          const response = await fetch("/api/v1/admin/overview", { credentials: "same-origin" });
          if (!response.ok) throw new Error("Operations overview is unavailable.");
          setAdminOverview(await response.json());
          return;
        }

        const endpointMap = {
          products: "/api/v1/admin/products",
          orders: "/api/v1/admin/orders",
          customers: "/api/v1/admin/customers",
          coupons: "/api/v1/admin/coupons",
        } as const;
        const response = await fetch(endpointMap[section], { credentials: "same-origin" });
        if (!response.ok) throw new Error("Admin data could not be loaded.");
        const result = await response.json();
        if (section === "products") setAdminProducts(result.items ?? []);
        if (section === "orders") setAdminOrders(result.items ?? []);
        if (section === "customers") setAdminCustomers(result.items ?? []);
        if (section === "coupons") setAdminCoupons(result.items ?? []);
      } catch (error) {
        setAdminError(error instanceof Error ? error.message : "Admin data could not be loaded.");
        if (section === "overview") setAdminOverview(null);
      }
    },
    [account, canAccessAdmin],
  );

  useEffect(() => {
    if (!account) {
      setAccountOrders([]);
      setAdminOverview(null);
      return;
    }
    void fetch("/api/v1/auth/account", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) {
          setAccountOrders([]);
          return;
        }
        const result: { orders: AccountOrder[] } = await response.json();
        setAccountOrders(result.orders ?? []);
      })
      .catch(() => setAccountOrders([]));
  }, [account]);

  useEffect(() => {
    if (!adminView || !account || !canAccessAdmin) return;
    void loadAdminData("overview");
    void loadAdminData("products");
    void loadAdminData("orders");
    void loadAdminData("customers");
    void loadAdminData("coupons");
  }, [account, adminView, canAccessAdmin, loadAdminData]);

  const refreshGate = useCallback(async () => {
    setStatus("checking");
    setGateError("");
    try {
      const response = await requestGate("status");
      if (!response.ok) throw new Error("gate unavailable");
      const result: { accepted: boolean } = await response.json();
      setStatus(result.accepted ? "accepted" : "required");
    } catch {
      if (import.meta.env.DEV) {
        setOfflinePreview(true);
        setStatus("required");
      } else {
        setStatus("unavailable");
        setGateError("We can’t confirm access right now. Please try again in a moment.");
      }
    }
  }, []);

  useEffect(() => {
    void refreshGate();
  }, [refreshGate]);

  const loadCatalog = useCallback(async () => {
    setCatalogState("loading");
    setCatalogError("");
    const params = new URLSearchParams({
      q: query,
      sort,
      page: String(page),
      pageSize: String(PAGE_SIZE),
      inStock: String(inStockOnly),
    });
    if (categorySlug) params.set("category", categorySlug);
    if (currencyCode) params.set("currency", currencyCode);
    if (minPriceMinor !== undefined) params.set("minPriceMinor", String(minPriceMinor));
    if (maxPriceMinor !== undefined) params.set("maxPriceMinor", String(maxPriceMinor));

    try {
      const [productResponse, categoryResponse, currencyResponse] = await Promise.all([
        api(`/products?${params.toString()}`),
        api("/categories"),
        api("/currencies"),
      ]);
      if (!productResponse.ok || !categoryResponse.ok || !currencyResponse.ok) {
        throw new Error("Catalog data is temporarily unavailable. Check the database and try again.");
      }
      const [productPage, categoryResult, currencyResult]: [ProductPage, { items: Category[] }, { items: Currency[] }] = await Promise.all([
        productResponse.json(),
        categoryResponse.json(),
        currencyResponse.json(),
      ]);

      if (import.meta.env.DEV && productPage.total === 0 && productPage.items.length === 0) {
        const result = demoPage({ query, categorySlug, currencyCode, minPriceMinor, maxPriceMinor, inStockOnly, sort, page });
        setDemoMode(true);
        setProducts(result.items);
        setTotal(result.total);
        setCategories(demoCategories);
        setCurrencies(demoCurrencies);
        setCatalogState("ready");
        return;
      }

      setDemoMode(false);
      setProducts(productPage.items);
      setTotal(productPage.total);
      setCategories(categoryResult.items.length ? categoryResult.items : demoCategories);
      setCurrencies(currencyResult.items.length ? currencyResult.items : demoCurrencies);
      setCatalogState("ready");
    } catch (error) {
      if (import.meta.env.DEV) {
        const result = demoPage({ query, categorySlug, currencyCode, minPriceMinor, maxPriceMinor, inStockOnly, sort, page });
        setDemoMode(true);
        setProducts(result.items);
        setTotal(result.total);
        setCategories(demoCategories);
        setCurrencies(demoCurrencies);
        setCatalogState("ready");
        setCatalogError("");
      } else {
        setCatalogState("error");
        setCatalogError(error instanceof Error ? error.message : "Catalog data is unavailable.");
      }
    }
  }, [categorySlug, currencyCode, inStockOnly, maxPriceMinor, minPriceMinor, page, query, sort]);

  useEffect(() => {
    if (status === "accepted" && !selectedProduct && !accountView) void loadCatalog();
  }, [accountView, loadCatalog, selectedProduct, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setQuery(searchText.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (!cartOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [cartOpen]);

  useEffect(() => {
    if (!authMode) return;
    const token = new URLSearchParams(window.location.search).get("verify");
    if (token) {
      setAuthMode("verify");
      setAuthMessage("Your email verification link is ready.");
    }
  }, [authMode]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`/api/v1/auth/${authMode === "register" ? "register" : "login"}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Please check your details and try again.");
      if (authMode === "register") {
        setAccount(result.user);
        setAuthMode("verify");
        setAuthMessage("Your account is ready. Check your inbox to verify your email.");
      } else {
        setAccount(result.user);
        setAuthMode(null);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "We couldn’t complete that request.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    const token = new FormData(event.currentTarget).get("token");
    try {
      const response = await fetch("/api/v1/auth/email/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Verification could not be completed.");
      setAuthMessage("Email verified. You can now sign in.");
      setAuthMode("login");
      window.history.replaceState({}, "", window.location.pathname);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Verification could not be completed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function resendVerification() {
    if (!account?.email) return;
    try {
      setAuthError("");
      const response = await fetch("/api/v1/auth/email/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: account.email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAuthMessage("If your account needs verification, a fresh link is on its way.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not resend that email.");
    }
  }

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGateError("");
    if (!confirmedAdult) {
      setGateError("Please confirm you are 18 or older.");
      return;
    }
    if (offlinePreview || import.meta.env.DEV) {
      setStatus("accepted");
      return;
    }
    try {
      const response = await requestGate("accept", { confirmedAdult });
      const result: { accepted?: boolean; error?: string } = await response.json();
      if (!response.ok || !result.accepted) throw new Error(result.error ?? "Please confirm your age.");
      setStatus("accepted");
    } catch (error) {
      setGateError(error instanceof Error ? error.message : "The age check could not be completed.");
    }
  }

  async function decline() {
    setGateError("");
    if (offlinePreview || import.meta.env.DEV) {
      setStatus("declined");
      return;
    }
    try {
      const response = await requestGate("decline", { confirmedMinor: true });
      if (!response.ok) throw new Error();
      setStatus("declined");
    } catch {
      setGateError("The request could not be completed. Please close this page to leave.");
    }
  }

  function accountAction() {
    if (!account) {
      setAuthMode("login");
      setAuthError("");
      return;
    }
    setAccountView(true);
    setSelectedProduct(null);
    setProductState("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function signOut() {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" });
    setAccount(null);
    setAccountView(false);
    setAdminView(false);
    setAdminSection("overview");
    setAuthMode(null);
    setAuthError("");
    setAuthMessage("");
  }

  function openAllProducts() {
    setSelectedProduct(null);
    setProductState("idle");
    setAccountView(false);
    setCategorySlug("");
    setQuery("");
    setSearchText("");
    setShowWishlist(false);
    setSaleOnly(false);
    setPage(1);
    scrollToShop();
  }

  function openNewIn() {
    setSelectedProduct(null);
    setProductState("idle");
    setAccountView(false);
    setCategorySlug("");
    setQuery("");
    setSearchText("");
    setShowWishlist(false);
    setSaleOnly(false);
    setSort("newest");
    setPage(1);
    scrollToShop();
  }

  function openSale() {
    setSelectedProduct(null);
    setProductState("idle");
    setAccountView(false);
    setCategorySlug("");
    setQuery("");
    setSearchText("");
    setShowWishlist(false);
    setSaleOnly(true);
    setPage(1);
    scrollToShop();
  }

  function openWishlist() {
    setSelectedProduct(null);
    setProductState("idle");
    setAccountView(false);
    setCategorySlug("");
    setQuery("");
    setSearchText("");
    setShowWishlist(true);
    setSaleOnly(false);
    setPage(1);
    scrollToShop();
  }

  function chooseCategory(slug: string) {
    setSelectedProduct(null);
    setProductState("idle");
    setAccountView(false);
    setCategorySlug(slug);
    setShowWishlist(false);
    setSaleOnly(false);
    setPage(1);
    scrollToShop();
  }

  function filterCategory(slug: string) {
    setCategorySlug(slug);
    setShowWishlist(false);
    setSaleOnly(false);
    setPage(1);
  }

  function submitSearch() {
    setSelectedProduct(null);
    setProductState("idle");
    setAccountView(false);
    setShowWishlist(false);
    setSaleOnly(false);
    setQuery(searchText.trim());
    setPage(1);
    scrollToShop();
  }

  function goHome() {
    setAccountView(false);
    setSelectedProduct(null);
    setProductState("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleWishlist(product: Product) {
    setWishlist((current) => {
      const next = new Set(current);
      if (next.has(product.id)) next.delete(product.id);
      else next.add(product.id);
      try {
        localStorage.setItem("serein-wishlist", JSON.stringify([...next]));
      } catch {
        // Storage may be unavailable in private browsing; the session still works.
      }
      return next;
    });
  }

  async function openProduct(slug: string) {
    setSelectedProduct(null);
    setProductState("loading");
    setProductError("");
    setAccountView(false);
    setAuthMode(null);
    const localProduct = demoProductBySlug(slug);
    if (demoMode && localProduct) {
      setSelectedProduct(localProduct);
      setProductState("idle");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    try {
      const response = await api(`/products/${encodeURIComponent(slug)}`);
      if (!response.ok) throw new Error("This product is not available right now.");
      const product: Product = await response.json();
      setSelectedProduct(product);
      setProductState("idle");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (import.meta.env.DEV && localProduct) {
        setDemoMode(true);
        setSelectedProduct(localProduct);
        setProductState("idle");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setProductState("error");
        setProductError(error instanceof Error ? error.message : "This product is not available right now.");
      }
    }
  }

  function backToCatalog() {
    setSelectedProduct(null);
    setProductState("idle");
    setProductError("");
    window.setTimeout(() => {
      document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function applyCatalogFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilterError("");
    try {
      const exponent = currencies.find((currency) => currency.code === currencyCode)?.minorUnitExponent;
      if ((minPriceText.trim() || maxPriceText.trim()) && exponent === undefined) {
        throw new Error("Choose a currency before filtering by price.");
      }
      const minimum = exponent === undefined ? undefined : parseMinorInput(minPriceText, exponent);
      const maximum = exponent === undefined ? undefined : parseMinorInput(maxPriceText, exponent);
      if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
        throw new Error("Maximum price must be at least the minimum price.");
      }
      setMinPriceMinor(minimum);
      setMaxPriceMinor(maximum);
      setQuery(searchText.trim());
      setShowWishlist(false);
      setSaleOnly(false);
      setPage(1);
    } catch (error) {
      setFilterError(error instanceof Error ? error.message : "Check the price filters.");
    }
  }

  function clearFilters() {
    setCategorySlug("");
    setQuery("");
    setSearchText("");
    setSort("featured");
    setInStockOnly(false);
    setCurrencyCode("GBP");
    setMinPriceText("");
    setMaxPriceText("");
    setMinPriceMinor(undefined);
    setMaxPriceMinor(undefined);
    setFilterError("");
    setShowWishlist(false);
    setSaleOnly(false);
    setPage(1);
  }

  function changeCurrency(code: string) {
    setCurrencyCode(code);
    setMinPriceText("");
    setMaxPriceText("");
    setMinPriceMinor(undefined);
    setMaxPriceMinor(undefined);
    if (!code && sort.startsWith("price_")) setSort("featured");
    setPage(1);
  }

  function changeSort(nextSort: string) {
    setSort(nextSort);
    setPage(1);
  }

  function changeStock(value: boolean) {
    setInStockOnly(value);
    setPage(1);
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    window.setTimeout(() => {
      document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  async function addToCart(product: Product, quantity = 1) {
    setCartBusy(true);
    setCartError("");
    setCheckoutMessage("");
    if (demoMode || product.id.startsWith("demo-")) {
      setCart((current) => {
        const currentItems = current?.items ?? [];
        const existing = currentItems.find((item) => item.productId === product.id);
        const nextItems = existing
          ? currentItems.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: Math.min(item.quantity + quantity, item.stockQuantity) }
                : item,
            )
          : [
              ...currentItems,
              {
                productId: product.id,
                name: product.name,
                slug: product.slug,
                priceMinor: product.priceMinor,
                currencyCode: product.currencyCode,
                stockQuantity: product.stockQuantity,
                quantity: Math.min(quantity, product.stockQuantity),
                imageUrl: product.images[0]?.secureUrl ?? null,
                art: product.art,
                tone: product.tone,
              },
            ];
        return buildDemoCart(nextItems, current?.couponCode ?? null);
      });
      setCartOpen(true);
      setCartBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/v1/cart/items", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCart(data);
      setCartOpen(true);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Could not add this item.");
    } finally {
      setCartBusy(false);
    }
  }

  async function openCart() {
    setCartError("");
    setCheckoutMessage("");
    if (demoMode) {
      setCart((current) => current ?? buildDemoCart([], null));
      setCartOpen(true);
      return;
    }
    try {
      const response = await fetch("/api/v1/cart", { credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCart(data);
      setCartOpen(true);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Your bag is unavailable right now.");
      setCartOpen(true);
    }
  }

  async function updateCartItem(productId: string, quantity: number) {
    if (demoMode || productId.startsWith("demo-")) {
      setCart((current) => {
        if (!current) return current;
        const nextItems =
          quantity === 0
            ? current.items.filter((item) => item.productId !== productId)
            : current.items.map((item) =>
                item.productId === productId ? { ...item, quantity: Math.min(quantity, item.stockQuantity) } : item,
              );
        return buildDemoCart(nextItems, current.couponCode ?? null);
      });
      setCartError("");
      return;
    }
    try {
      const response = await fetch(`/api/v1/cart/items/${productId}`, {
        method: quantity === 0 ? "DELETE" : "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCart(data);
      setCartError("");
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Could not update your bag.");
    }
  }

  async function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCartError("");
    const code = couponText.trim().toUpperCase();
    if (!code) return;
    if (demoMode) {
      if (code !== "SEREIN10" && code !== "WELCOME15") {
        setCartError("That code isn’t valid. Try SEREIN10 for 10% off your first order.");
        return;
      }
      setCart((current) => buildDemoCart(current?.items ?? [], code));
      setCouponText("");
      setCheckoutMessage("");
      return;
    }
    try {
      const response = await fetch("/api/v1/cart/coupon", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCart(data);
      setCouponText("");
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "That discount code could not be applied.");
    }
  }

  function checkout() {
    setCheckoutMessage(
      demoMode
        ? "You’re in the design preview — checkout isn’t connected in preview mode."
        : "Checkout is ready for the next build step. Your bag is saved.",
    );
  }

  async function updateOrderStatus(orderId: string, nextStatus: string) {
    try {
      setAdminError("");
      const response = await fetch(`/api/v1/admin/orders/${orderId}/status`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update the order.");
      await loadAdminData("overview");
      await loadAdminData("orders");
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Could not update that order.");
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setAdminError("");
      const payload = {
        name: String(form.get("name") ?? "").trim(),
        description: String(form.get("description") ?? "").trim(),
        shortDescription: String(form.get("shortDescription") ?? "").trim() || null,
        priceMinor: Number(form.get("priceMinor") ?? 0),
        currencyCode: String(form.get("currencyCode") ?? "GBP").toUpperCase(),
        stockQuantity: Number(form.get("stockQuantity") ?? 0),
        isFeatured: String(form.get("isFeatured") ?? "false") === "true",
        isPublished: String(form.get("isPublished") ?? "true") !== "false",
      };
      if (!payload.name || !payload.description) throw new Error("Product name and description are required.");
      const response = await fetch("/api/v1/admin/products", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create this product.");
      event.currentTarget.reset();
      await loadAdminData("products");
      await loadAdminData("overview");
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Could not create that product.");
    }
  }

  async function createCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setAdminError("");
      const payload = {
        code: String(form.get("code") ?? "").trim(),
        percentOff: Number(form.get("percentOff") ?? 0) || null,
        amountOffMinor: Number(form.get("amountOffMinor") ?? 0) || null,
        currencyCode: String(form.get("currencyCode") ?? "GBP").toUpperCase() || null,
        minimumSubtotalMinor: Number(form.get("minimumSubtotalMinor") ?? 0),
        usageLimit: Number(form.get("usageLimit") ?? 0) || null,
        startsAt: form.get("startsAt") ? String(form.get("startsAt")) : null,
        expiresAt: form.get("expiresAt") ? String(form.get("expiresAt")) : null,
        isEnabled: String(form.get("isEnabled") ?? "true") !== "false",
      };
      if (!payload.code) throw new Error("Coupon code is required.");
      const response = await fetch("/api/v1/admin/coupons", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create this coupon.");
      event.currentTarget.reset();
      await loadAdminData("coupons");
      await loadAdminData("overview");
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Could not create that coupon.");
    }
  }

  const specialBase = showWishlist && demoMode ? demoProducts : saleOnly && demoMode ? demoProducts : products;
  const specialFiltered = showWishlist
    ? specialBase.filter((product) => wishlist.has(product.id))
    : saleOnly
      ? products.filter((product) => product.compareAtMinor !== null)
      : products;
  const displayProducts = showWishlist || saleOnly ? specialFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : products;
  const displayTotal = showWishlist || saleOnly ? specialFiltered.length : total;
  const pageCount = Math.max(1, Math.ceil(displayTotal / PAGE_SIZE));
  const cartCount = (cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const relatedProducts = (demoMode ? demoProducts : products)
    .filter((product) => product.id !== selectedProduct?.id)
    .slice(0, 4);

  if (status === "declined") {
    return (
      <main className="gate-shell">
        <section className="gate-card declined-card" aria-live="polite">
          <span className="gate-logo">serein<span>.</span></span>
          <div className="empty-icon"><Icon name="lock" size={28} /></div>
          <p className="eyebrow">A considered space for adults</p>
          <h1>Thanks for checking in.</h1>
          <p className="gate-copy">This store is intended for adults. Please close this page to leave.</p>
        </section>
      </main>
    );
  }

  if (status !== "accepted") {
    return (
      <AgeGate
        status={status}
        confirmedAdult={confirmedAdult}
        gateError={gateError}
        previewMode={offlinePreview}
        onConfirmedChange={setConfirmedAdult}
        onAccept={accept}
        onDecline={() => void decline()}
        onRetry={() => void refreshGate()}
      />
    );
  }

  if (authMode) {
    return (
      <AuthScreen
        mode={authMode}
        account={account}
        busy={authBusy}
        error={authError}
        message={authMessage}
        verifyToken={verifyToken}
        onSubmit={submitAuth}
        onVerify={verifyEmail}
        onResend={() => void resendVerification()}
        onBack={() => {
          setAuthMode(null);
          setAuthError("");
          setAuthMessage("");
        }}
        onSwitchMode={(mode) => {
          setAuthMode(mode);
          setAuthError("");
          setAuthMessage("");
        }}
      />
    );
  }

  const adminTabs: Array<{ key: AdminView; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "products", label: "Products" },
    { key: "orders", label: "Orders" },
    { key: "customers", label: "Customers" },
    { key: "coupons", label: "Coupons" },
  ];

  const accountPage = account ? (
    <section className="account-page">
      <div className="container">
        <div className="account-head">
          <div>
            <p className="eyebrow">Your account</p>
            <h1>Hi, {account.displayName.split(" ")[0]}.</h1>
            <p>{account.email}</p>
          </div>
          <div className="account-actions">
            <button className="button ghost" type="button" onClick={() => setAccountView(false)}>Back to store</button>
            {canAccessAdmin && (
              <button
                className="button dark"
                type="button"
                onClick={() => {
                  setAdminView((current) => !current);
                  setAdminSection("overview");
                }}
              >
                {adminView ? "View my orders" : "Admin console"}
              </button>
            )}
            <button className="text-button inline" type="button" onClick={() => void signOut()}>Sign out</button>
          </div>
        </div>

        {adminView && canAccessAdmin ? (
          <div className="admin-wrap">
            <div className="admin-tabs" role="tablist" aria-label="Admin sections">
              {adminTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={adminSection === tab.key ? "active" : ""}
                  onClick={() => {
                    setAdminSection(tab.key);
                    void loadAdminData(tab.key);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {adminError && <p className="form-error" role="alert">{adminError}</p>}

            {adminSection === "overview" && (
              adminOverview ? (
                <>
                  <div className="stat-grid">
                    <article className="stat-card"><span>Products</span><strong>{adminOverview.productCount}</strong></article>
                    <article className="stat-card"><span>Orders</span><strong>{adminOverview.orderCount}</strong></article>
                    <article className="stat-card"><span>Customers</span><strong>{adminOverview.customerCount}</strong></article>
                    <article className="stat-card"><span>Coupons</span><strong>{adminOverview.couponCount}</strong></article>
                  </div>
                  <div className="admin-list">
                    {adminOverview.recentOrders.map((order) => (
                      <article className="admin-row" key={order.id}>
                        <div><strong>#{order.id.slice(0, 8)}</strong><span>{formatDate(order.createdAt)}</span></div>
                        <span>{order.itemCount} items</span>
                        <span className="status-chip">{order.status}</span>
                        <strong>{formatMoney(order.totalMinor, order.currencyCode, 2)}</strong>
                      </article>
                    ))}
                  </div>
                </>
              ) : <p className="loading-state">Loading operations data…</p>
            )}

            {adminSection === "products" && (
              <>
                <form className="admin-form" onSubmit={createProduct}>
                  <label>Name<input name="name" required /></label>
                  <label className="wide">Description<textarea name="description" required rows={3} /></label>
                  <label>Short blurb<input name="shortDescription" /></label>
                  <label>Price (minor units)<input name="priceMinor" type="number" min="0" defaultValue={0} /></label>
                  <label>Currency<select name="currencyCode" defaultValue="GBP"><option>GBP</option><option>EUR</option><option>USD</option></select></label>
                  <label>Stock<input name="stockQuantity" type="number" min="0" defaultValue={0} /></label>
                  <label className="check-label"><input name="isFeatured" type="checkbox" /> Featured</label>
                  <label className="check-label"><input name="isPublished" type="checkbox" defaultChecked /> Published</label>
                  <button type="submit" className="button primary">Create product</button>
                </form>
                <div className="admin-list">
                  {adminProducts.length === 0 ? <p className="loading-state">No products in the catalogue.</p> : adminProducts.map((product) => (
                    <article className="admin-row" key={product.id}>
                      <div><strong>{product.name}</strong><span>{product.categories.map((category) => category.name).join(", ") || "Uncategorised"}</span></div>
                      <span>{product.stockQuantity} in stock</span>
                      <span className="status-chip">{product.isPublished ? "Published" : "Draft"}</span>
                      <strong>{formatMoney(product.priceMinor, product.currencyCode, 2)}</strong>
                    </article>
                  ))}
                </div>
              </>
            )}

            {adminSection === "orders" && (
              <div className="admin-list">
                {adminOrders.length === 0 ? <p className="loading-state">No orders yet.</p> : adminOrders.map((order) => (
                  <article className="admin-row" key={order.id}>
                    <div><strong>#{order.id.slice(0, 8)}</strong><span>{order.customer ? `${order.customer.displayName} · ${order.customer.email}` : "Guest checkout"}</span></div>
                    <span>{order.itemCount} items</span>
                    <label className="admin-status">
                      <select value={order.status} onChange={(event) => void updateOrderStatus(order.id, event.target.value)} aria-label={`Status for order ${order.id.slice(0, 8)}`}>
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="processing">processing</option>
                        <option value="shipped">shipped</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                        <option value="refunded">refunded</option>
                      </select>
                    </label>
                    <strong>{formatMoney(order.totalMinor, order.currencyCode, 2)}</strong>
                  </article>
                ))}
              </div>
            )}

            {adminSection === "customers" && (
              <div className="admin-list">
                {adminCustomers.length === 0 ? <p className="loading-state">No customers found.</p> : adminCustomers.map((customer) => (
                  <article className="admin-row" key={customer.id}>
                    <div><strong>{customer.displayName || "Customer"}</strong><span>{customer.email}</span></div>
                    <span>{customer.roles.join(", ") || "No roles"}</span>
                    <span className="status-chip">{customer.emailVerified ? "Verified" : "Unverified"}</span>
                    <strong>{formatDate(customer.createdAt)}</strong>
                  </article>
                ))}
              </div>
            )}

            {adminSection === "coupons" && (
              <>
                <form className="admin-form" onSubmit={createCoupon}>
                  <label>Code<input name="code" required /></label>
                  <label>Percent off<input name="percentOff" type="number" min="0" max="100" /></label>
                  <label>Amount off (minor)<input name="amountOffMinor" type="number" min="0" /></label>
                  <label>Currency<select name="currencyCode" defaultValue="GBP"><option>GBP</option><option>EUR</option><option>USD</option></select></label>
                  <label>Minimum subtotal<input name="minimumSubtotalMinor" type="number" min="0" defaultValue={0} /></label>
                  <label>Usage limit<input name="usageLimit" type="number" min="1" /></label>
                  <label>Starts<input name="startsAt" type="date" /></label>
                  <label>Expires<input name="expiresAt" type="date" /></label>
                  <label className="check-label"><input name="isEnabled" type="checkbox" defaultChecked /> Enabled</label>
                  <button type="submit" className="button primary">Create coupon</button>
                </form>
                <div className="admin-list">
                  {adminCoupons.length === 0 ? <p className="loading-state">No coupons created.</p> : adminCoupons.map((coupon) => (
                    <article className="admin-row" key={coupon.id}>
                      <div><strong>{coupon.code}</strong><span>{coupon.usedCount} used{coupon.usageLimit ? ` of ${coupon.usageLimit}` : ""}</span></div>
                      <span>{coupon.percentOff !== null ? `${coupon.percentOff}%` : `${formatMoney(coupon.amountOffMinor ?? 0, coupon.currencyCode ?? "GBP", 2)}`}</span>
                      <span className="status-chip">{coupon.isEnabled ? "Enabled" : "Disabled"}</span>
                      <strong>{coupon.currencyCode ?? "—"}</strong>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="account-orders">
            <div className="section-heading">
              <div><p className="eyebrow">Order history</p><h2>Your recent orders</h2></div>
            </div>
            {accountOrders.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon"><Icon name="bag" size={28} /></span>
                <h3>No orders just yet.</h3>
                <p>Your order history will appear here after your first purchase.</p>
                <button className="button primary" type="button" onClick={() => setAccountView(false)}>Start shopping</button>
              </div>
            ) : (
              <div className="account-order-list">
                {accountOrders.map((order) => (
                  <article className="account-order" key={order.id}>
                    <div className="account-order-head">
                      <div><strong>Order #{order.id.slice(0, 8)}</strong><span>{formatDate(order.createdAt)}</span></div>
                      <span className="status-chip">{order.status}</span>
                    </div>
                    <div className="account-order-meta">
                      <span>{order.itemCount} item{order.itemCount === 1 ? "" : "s"}</span>
                      <span>Payment: {order.paymentStatus}</span>
                      {order.shippingMethodName && <span>{order.shippingMethodName}</span>}
                    </div>
                    <div className="account-order-total">{formatMoney(order.totalMinor, order.currencyCode, 2)}</div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  ) : null;

  return (
    <div className="site">
      <StoreHeader
        categories={categories}
        searchText={searchText}
        cartCount={cartCount}
        wishlistCount={wishlist.size}
        accountLabel={account ? account.displayName.split(" ")[0] : ""}
        onSearchChange={setSearchText}
        onSearchSubmit={submitSearch}
        onHome={goHome}
        onCategory={chooseCategory}
        onAllProducts={openAllProducts}
        onNewIn={openNewIn}
        onSale={openSale}
        onWishlist={openWishlist}
        onAccount={accountAction}
        onCart={() => void openCart()}
      />

      {accountView && account ? (
        accountPage
      ) : productState === "loading" ? (
        <main className="product-detail-page">
          <div className="container">
            <div className="detail-loading" aria-busy="true" aria-label="Loading product">
              <div className="detail-loading-art" />
              <div className="detail-loading-copy">
                <div className="skeleton-line short" />
                <div className="skeleton-line title" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
                <div className="skeleton-line tiny" />
              </div>
            </div>
          </div>
        </main>
      ) : productState === "error" ? (
        <main className="product-detail-page">
          <div className="container">
            <div className="empty-state">
              <span className="empty-icon"><Icon name="search" size={28} /></span>
              <h3>We couldn’t open that product.</h3>
              <p>{productError}</p>
              <button className="button primary" type="button" onClick={backToCatalog}>Back to the collection</button>
            </div>
          </div>
        </main>
      ) : selectedProduct ? (
        <ProductDetailView
          product={selectedProduct}
          related={relatedProducts}
          wishlisted={wishlist.has(selectedProduct.id)}
          wishlist={wishlist}
          cartBusy={cartBusy}
          cartError={cartError}
          onAddToCart={(product, quantity) => void addToCart(product, quantity)}
          onToggleWishlist={toggleWishlist}
          onOpenProduct={(slug) => void openProduct(slug)}
          onBack={backToCatalog}
          onCategory={chooseCategory}
        />
      ) : (
        <>
          <HomePage
            products={products}
            categories={categories}
            onCategory={chooseCategory}
            onOpenProduct={(slug) => void openProduct(slug)}
            onAddToCart={(product) => void addToCart(product)}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            onShopAll={openAllProducts}
            onNewIn={openNewIn}
            onSale={openSale}
          />
          <CatalogSection
            products={displayProducts}
            categories={categories}
            currencies={currencies}
            total={displayTotal}
            page={page}
            pageCount={pageCount}
            catalogState={catalogState}
            catalogError={catalogError}
            categorySlug={categorySlug}
            query={query}
            sort={sort}
            inStockOnly={inStockOnly}
            currencyCode={currencyCode}
            minPriceText={minPriceText}
            maxPriceText={maxPriceText}
            filterError={filterError}
            showWishlist={showWishlist}
            saleOnly={saleOnly}
            wishlist={wishlist}
            onCategoryChange={filterCategory}
            onSortChange={changeSort}
            onStockChange={changeStock}
            onCurrencyChange={changeCurrency}
            onMinPriceChange={setMinPriceText}
            onMaxPriceChange={setMaxPriceText}
            onApplyFilters={applyCatalogFilters}
            onClearFilters={clearFilters}
            onPageChange={changePage}
            onRetry={() => void loadCatalog()}
            onOpenProduct={(slug) => void openProduct(slug)}
            onAddToCart={(product) => void addToCart(product)}
            onToggleWishlist={toggleWishlist}
            onClearSpecial={() => {
              setShowWishlist(false);
              setSaleOnly(false);
              setPage(1);
            }}
          />
        </>
      )}

      <StoreFooter categories={categories} onCategory={chooseCategory} onHome={goHome} />

      {cartOpen && (
        <CartDrawer
          cart={cart}
          error={cartError}
          couponText={couponText}
          exponent={currencies.find((currency) => currency.code === cart?.currencyCode)?.minorUnitExponent ?? 2}
          checkoutMessage={checkoutMessage}
          onCouponTextChange={setCouponText}
          onClose={() => setCartOpen(false)}
          onQuantity={(productId, quantity) => void updateCartItem(productId, quantity)}
          onCoupon={applyCoupon}
          onCheckout={checkout}
        />
      )}
    </div>
  );
}
