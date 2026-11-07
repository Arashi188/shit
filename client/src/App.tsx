import { useCallback, useEffect, useState, type FormEvent } from "react";

type GateStatus = "checking" | "required" | "accepted" | "declined" | "unavailable";
type Category = { id: string; name: string; slug: string; description: string | null; imageUrl: string | null; parentId: string | null; sortOrder: number };
type Product = {
  id: string; name: string; slug: string; shortDescription: string | null; description: string;
  priceMinor: number; compareAtMinor: number | null; currencyCode: string; currencyExponent: number;
  stockQuantity: number; isFeatured: boolean; brand: { name: string; slug: string } | null;
  categories: { id: string; name: string; slug: string }[];
  images: { secureUrl: string; publicId: string; altText: string; sortOrder: number }[];
};
type ProductPage = { items: Product[]; total: number; page: number; pageSize: number };
type Currency = { code: string; minorUnitExponent: number };

function parseMinorInput(value: string, exponent: number): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const pattern = exponent === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{1,${exponent}})?$`);
  if (!pattern.test(normalized)) throw new Error(`Enter a price using at most ${exponent} decimal places.`);
  const [whole, fractional = ""] = normalized.split(".");
  return Number(whole) * (10 ** exponent) + Number((fractional + "0".repeat(exponent)).slice(0, exponent) || "0");
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

function formatMoney(amountMinor: number, currencyCode: string, exponent: number): string {
  const major = amountMinor / (10 ** exponent);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency", currency: currencyCode, minimumFractionDigits: exponent, maximumFractionDigits: exponent,
    }).format(major);
  } catch {
    return `${currencyCode} ${major.toLocaleString(undefined, { minimumFractionDigits: exponent, maximumFractionDigits: exponent })}`;
  }
}

export function App() {
  const [status, setStatus] = useState<GateStatus>("checking");
  const [confirmedAdult, setConfirmedAdult] = useState(false);
  const [gateError, setGateError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [searchText, setSearchText] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productState, setProductState] = useState<"idle" | "loading" | "error">("idle");
  const [productError, setProductError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register" | "verify" | null>(null);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [account, setAccount] = useState<{ id: string; email: string; displayName: string; roles: string[]; permissions: string[] } | null>(null);
  const [accountView, setAccountView] = useState(false);
  const [adminView, setAdminView] = useState(false);
  const [adminSection, setAdminSection] = useState<"overview" | "products" | "orders" | "customers" | "coupons">("overview");
  const [adminOverview, setAdminOverview] = useState<{ productCount: number; orderCount: number; customerCount: number; couponCount: number; recentOrders: Array<{ id: string; status: string; totalMinor: number; currencyCode: string; createdAt: string; itemCount: number }> } | null>(null);
  const [adminProducts, setAdminProducts] = useState<Array<{ id: string; name: string; slug: string; priceMinor: number; currencyCode: string; stockQuantity: number; isPublished: boolean; isFeatured: boolean; brandName: string | null; categories: Array<{ id: string; name: string }>; imageUrl: string | null; createdAt: string }>>([]);
  const [adminOrders, setAdminOrders] = useState<Array<{ id: string; status: string; paymentStatus: string; totalMinor: number; currencyCode: string; customer: { email: string; displayName: string } | null; itemCount: number; createdAt: string }>>([]);
  const [adminCustomers, setAdminCustomers] = useState<Array<{ id: string; email: string; displayName: string; emailVerified: boolean; roles: string[]; createdAt: string }>>([]);
  const [adminCoupons, setAdminCoupons] = useState<Array<{ id: string; code: string; percentOff: number | null; amountOffMinor: number | null; currencyCode: string | null; minimumSubtotalMinor: number; usageLimit: number | null; usedCount: number; isEnabled: boolean; startsAt: string | null; expiresAt: string | null }>>([]);
  const [adminError, setAdminError] = useState("");
  const [accountOrders, setAccountOrders] = useState<Array<{ id: string; createdAt: string; status: string; totalMinor: number; currencyCode: string; paymentStatus: string; itemCount: number; shippingMethodName: string | null }>>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<any>(null);
  const [cartError, setCartError] = useState("");
  const [cartBusy, setCartBusy] = useState(false);
  const [couponText, setCouponText] = useState("");

  async function addToCart(productId: string) {
    setCartBusy(true); setCartError("");
    try { const response = await fetch("/api/v1/cart/items", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId, quantity: 1 }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setCart(data); setCartOpen(true); }
    catch (error) { setCartError(error instanceof Error ? error.message : "Could not add this item."); }
    finally { setCartBusy(false); }
  }
  async function openCart() { setCartError(""); try { const response = await fetch("/api/v1/cart", { credentials: "same-origin" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setCart(data); setCartOpen(true); } catch (error) { setCartError(error instanceof Error ? error.message : "Cart is unavailable."); } }
  async function updateCartItem(productId: string, quantity: number) {
    try { const response = await fetch(`/api/v1/cart/items/${productId}`, { method: quantity === 0 ? "DELETE" : "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ quantity }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setCart(data); }
    catch (error) { setCartError(error instanceof Error ? error.message : "Could not update your cart."); }
  }
  async function applyCoupon(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { const response = await fetch("/api/v1/cart/coupon", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: couponText }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setCart(data); setCartError(""); } catch (error) { setCartError(error instanceof Error ? error.message : "Discount code could not be applied."); } }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthBusy(true); setAuthError(""); setAuthMessage("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`/api/v1/auth/${authMode === "register" ? "register" : "login"}`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Please check your details and try again.");
      if (authMode === "register") { setAccount(result.user); setAuthMode("verify"); setAuthMessage("Your account is ready. Check your inbox to verify your email."); }
      else { setAccount(result.user); setAuthMode(null); setAuthMessage(""); }
    } catch (error) { setAuthError(error instanceof Error ? error.message : "We couldn’t complete that request."); }
    finally { setAuthBusy(false); }
  }
  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthBusy(true); setAuthError("");
    const token = new FormData(event.currentTarget).get("token");
    try { const response = await fetch("/api/v1/auth/email/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setAuthMessage("Email verified. You can now sign in."); setAuthMode("login"); window.history.replaceState({}, "", window.location.pathname); }
    catch (error) { setAuthError(error instanceof Error ? error.message : "Verification could not be completed."); }
    finally { setAuthBusy(false); }
  }

  const canAccessAdmin = Boolean(account && (account.roles.includes("super_admin") || account.permissions.some((permission) => permission.includes("catalog") || permission.includes("orders") || permission.includes("customers") || permission.includes("promotions") || permission.includes("content") || permission.includes("audit"))));

  const loadAdminData = useCallback(async (section: "overview" | "products" | "orders" | "customers" | "coupons") => {
    if (!account || !canAccessAdmin) return;
    try {
      setAdminError("");
      if (section === "overview") {
        const response = await fetch("/api/v1/admin/overview", { credentials: "same-origin" });
        if (!response.ok) throw new Error("Operations overview is unavailable.");
        const result = await response.json();
        setAdminOverview(result);
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
  }, [account, canAccessAdmin]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("verify");
    if (token) { setAuthMode("verify"); setAuthMessage("Your email verification link is ready."); }
    void fetch("/api/v1/auth/me", { credentials: "same-origin" }).then(async (response) => { if (response.ok) { const result = await response.json(); setAccount(result.user); } }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!account) {
      setAccountOrders([]);
      setAdminOverview(null);
      return;
    }
    void fetch("/api/v1/auth/account", { credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) {
        setAccountOrders([]);
        return;
      }
      const result: { orders: Array<{ id: string; createdAt: string; status: string; totalMinor: number; currencyCode: string; paymentStatus: string; itemCount: number; shippingMethodName: string | null }> } = await response.json();
      setAccountOrders(result.orders ?? []);
    }).catch(() => setAccountOrders([]));
  }, [account]);

  useEffect(() => {
    if (!adminView || !account || !canAccessAdmin) return;
    void loadAdminData("overview");
    void loadAdminData("products");
    void loadAdminData("orders");
    void loadAdminData("customers");
    void loadAdminData("coupons");
  }, [account, adminView, canAccessAdmin, loadAdminData]);

  async function accountAction() {
    if (!account) { setAuthMode("login"); setAuthError(""); return; }
    setAccountView(true);
  }

  async function signOut() {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" });
    setAccount(null);
    setAccountView(false);
    setAdminView(false);
    setAdminSection("overview");
    setAuthMode(null);
    setAuthError("");
  }

  const refreshGate = useCallback(async () => {
    setStatus("checking");
    setGateError("");
    try {
      const response = await requestGate("status");
      if (!response.ok) throw new Error();
      const result: { accepted: boolean } = await response.json();
      setStatus(result.accepted ? "accepted" : "required");
    } catch {
      setStatus("unavailable");
      setGateError("We can’t confirm access right now. Please try again in a moment.");
    }
  }, []);

  useEffect(() => { void refreshGate(); }, [refreshGate]);

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGateError("");
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
    try {
      const response = await requestGate("decline", { confirmedMinor: true });
      if (!response.ok) throw new Error();
      setStatus("declined");
    } catch {
      setGateError("The request could not be completed. Please close this page to leave.");
    }
  }

  const loadCatalog = useCallback(async () => {
    setCatalogState("loading");
    setCatalogError("");
    const params = new URLSearchParams({ q: query, sort, page: String(page), pageSize: "12", inStock: String(inStockOnly) });
    if (categorySlug) params.set("category", categorySlug);
    if (currencyCode) params.set("currency", currencyCode);
    if (minPriceMinor !== undefined) params.set("minPriceMinor", String(minPriceMinor));
    if (maxPriceMinor !== undefined) params.set("maxPriceMinor", String(maxPriceMinor));
    try {
      const [productResponse, categoryResponse, currencyResponse] = await Promise.all([
        api(`/products?${params.toString()}`), api("/categories"), api("/currencies"),
      ]);
      if (!productResponse.ok || !categoryResponse.ok || !currencyResponse.ok) throw new Error("Catalog data is temporarily unavailable. Check the database and try again.");
      const [productPage, categoryResult, currencyResult]: [ProductPage, { items: Category[] }, { items: Currency[] }] = await Promise.all([
        productResponse.json(), categoryResponse.json(), currencyResponse.json(),
      ]);
      setProducts(productPage.items);
      setTotal(productPage.total);
      setCategories(categoryResult.items);
      setCurrencies(currencyResult.items);
      setCatalogState("ready");
    } catch (error) {
      setCatalogState("error");
      setCatalogError(error instanceof Error ? error.message : "Catalog data is unavailable.");
    }
  }, [categorySlug, currencyCode, inStockOnly, maxPriceMinor, minPriceMinor, page, query, sort]);

  useEffect(() => {
    if (status === "accepted" && !selectedProduct) void loadCatalog();
  }, [loadCatalog, selectedProduct, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setPage(1); setQuery(searchText.trim()); }, 250);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const pageCount = Math.max(1, Math.ceil(total / 12));

  function applyCatalogFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilterError("");
    try {
      const exponent = currencies.find((currency) => currency.code === currencyCode)?.minorUnitExponent;
      if ((minPriceText.trim() || maxPriceText.trim()) && exponent === undefined) throw new Error("Choose a currency before filtering by price.");
      const minimum = exponent === undefined ? undefined : parseMinorInput(minPriceText, exponent);
      const maximum = exponent === undefined ? undefined : parseMinorInput(maxPriceText, exponent);
      if (minimum !== undefined && maximum !== undefined && minimum > maximum) throw new Error("Maximum price must be at least the minimum price.");
      setMinPriceMinor(minimum);
      setMaxPriceMinor(maximum);
      setQuery(searchText.trim());
      setPage(1);
    } catch (error) {
      setFilterError(error instanceof Error ? error.message : "Check the price filters.");
    }
  }

  async function openProduct(slug: string) {
    setSelectedProduct(null);
    setProductState("loading");
    setProductError("");
    try {
      const response = await api(`/products/${encodeURIComponent(slug)}`);
      if (!response.ok) throw new Error("This product is not available right now.");
      const product: Product = await response.json();
      setSelectedProduct(product);
      setProductState("idle");
    } catch (error) {
      setProductState("error");
      setProductError(error instanceof Error ? error.message : "This product is not available right now.");
    }
  }

  function backToCatalog() {
    setSelectedProduct(null);
    setProductState("idle");
    setPage(1);
    void loadCatalog();
  }

  if (status === "declined") {
    return <main className="gate-shell"><section className="gate-card" aria-live="polite"><span className="brand-mark">serein<span>.</span></span><p className="eyebrow">A considered space for adults</p><h1>Thanks for checking in.</h1><p>This store is intended for adults. Please close this page to leave.</p></section></main>;
  }

  if (status !== "accepted") {
    return (
      <main className="gate-shell">
        <section className="gate-card" aria-labelledby="gate-title" aria-live="polite">
          <span className="brand-mark">serein<span>.</span></span>
          <p className="eyebrow">A considered space for adults</p>
          <h1 id="gate-title">A quick check-in.</h1>
          <p className="gate-copy">Please confirm you are 18 or older to continue.</p>
          {status === "checking" && <p className="status-note">Checking your access…</p>}
          {status === "unavailable" && <button className="text-button" type="button" onClick={() => void refreshGate()}>Try again</button>}
          {status === "required" && <>
            <form onSubmit={accept}>
              <label className="age-check"><input type="checkbox" checked={confirmedAdult} onChange={(event) => setConfirmedAdult(event.target.checked)} /><span>I am 18 or older (or the age of majority where I live).</span></label>
              <button className="primary-button" type="submit" disabled={!confirmedAdult}>Continue <span aria-hidden="true">↗</span></button>
            </form>
            <button className="text-button" type="button" onClick={() => void decline()}>I am under 18</button>
          </>}
          {gateError && <p className="error-note" role="alert">{gateError}</p>}
          <small>Your confirmation is stored privately in a secure, signed cookie. Requirements may vary by location.</small>
        </section>
      </main>
    );
  }

  if (authMode) return <main className="gate-shell"><section className="gate-card auth-card"><button type="button" className="auth-back" onClick={() => { setAuthMode(null); setAuthError(""); }}>← Back to Serein</button><span className="brand-mark">serein<span>.</span></span><p className="eyebrow">Your private space</p><h1>{authMode === "register" ? "Create your account." : authMode === "verify" ? "Verify your email." : "Welcome back."}</h1><p className="gate-copy">{authMode === "verify" ? `We sent a verification link to ${account?.email ?? "your inbox"}. Use the button in the email to verify.` : "A thoughtful place to keep your details and orders together."}</p>{authMode === "verify" ? <form onSubmit={verifyEmail}><input type="hidden" name="token" value={new URLSearchParams(window.location.search).get("verify") ?? ""} /><button className="primary-button" disabled={authBusy}>{authBusy ? "Checking…" : "Verify email"}</button></form> : <form onSubmit={submitAuth}>{authMode === "register" && <label>Your name<input name="displayName" required minLength={1} maxLength={120} autoComplete="name" /></label>}<label>Email address<input type="email" name="email" required autoComplete="email" /></label><label>Password<input type="password" name="password" required minLength={authMode === "register" ? 12 : 1} maxLength={128} autoComplete={authMode === "register" ? "new-password" : "current-password"} />{authMode === "register" && <small>Use at least 12 characters.</small>}</label><button className="primary-button" disabled={authBusy}>{authBusy ? "Please wait…" : authMode === "register" ? "Create account" : "Sign in"}</button></form>}{authError && <p className="error-note" role="alert">{authError}</p>}{authMessage && <p className="status-note" role="status">{authMessage}</p>}{authMode === "verify" && account?.email && <button type="button" className="text-button" onClick={() => void fetch("/api/v1/auth/email/resend", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: account.email }) }).then(() => setAuthMessage("If needed, a new verification link has been sent."))}>Resend verification email</button>}{authMode !== "verify" && <button type="button" className="text-button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>{authMode === "login" ? "New to Serein? Create an account" : "Already have an account? Sign in"}</button>}<small>We use your information only to manage your account and orders.</small></section></main>;

  const adminTabs: Array<{ key: "overview" | "products" | "orders" | "customers" | "coupons"; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "products", label: "Products" },
    { key: "orders", label: "Orders" },
    { key: "customers", label: "Customers" },
    { key: "coupons", label: "Coupons" },
  ];

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
        currencyCode: String(form.get("currencyCode") ?? "USD").toUpperCase(),
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
        currencyCode: String(form.get("currencyCode") ?? "USD").toUpperCase() || null,
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

  if (account && accountView) {
    return (
      <main className="store-shell">
        <header className="store-header">
          <button className="wordmark" type="button" onClick={() => setAccountView(false)}>serein<span>.</span></button>
          <div className="header-actions">
            <button className="account-link" type="button" onClick={() => setAccountView(false)}>Back to store</button>
            {canAccessAdmin && <button className="account-link" type="button" onClick={() => { setAdminView((current) => !current); setAdminSection("overview"); }}>Admin</button>}
            <button className="account-link" type="button" onClick={() => void signOut()}>Sign out</button>
          </div>
        </header>

        {adminView && canAccessAdmin ? (
          <section className="standard-section">
            <p className="eyebrow">Admin console</p>
            <h2>Operations overview</h2>
            <div className="category-filters" aria-label="Admin sections">
              {adminTabs.map((tab) => (
                <button type="button" key={tab.key} className={adminSection === tab.key ? "active" : ""} onClick={() => { setAdminSection(tab.key); void loadAdminData(tab.key); }}>{tab.label}</button>
              ))}
            </div>
            {adminError && <p className="error-note" role="alert">{adminError}</p>}

            {adminSection === "overview" && (
              adminOverview ? (
                <div className="order-list">
                  <article className="order-card">
                    <div className="order-card-head"><strong>Inventory</strong><span>{adminOverview.productCount} products</span></div>
                    <div className="order-meta"><span>Orders: {adminOverview.orderCount}</span><span>Customers: {adminOverview.customerCount}</span><span>Coupons: {adminOverview.couponCount}</span></div>
                  </article>
                  {adminOverview.recentOrders.map((order) => (
                    <article className="order-card" key={order.id}>
                      <div className="order-card-head"><strong>#{order.id.slice(0, 8)}</strong><span>{order.status}</span></div>
                      <div className="order-meta"><span>{order.itemCount} items</span><span>{new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span></div>
                      <div className="order-total"><strong>{formatMoney(order.totalMinor, order.currencyCode, 2)}</strong></div>
                    </article>
                  ))}
                </div>
              ) : <div className="catalog-message"><h3>Loading operations data…</h3></div>
            )}

            {adminSection === "products" && (
              <>
                <form className="coupon-form" onSubmit={createProduct}>
                  <label>Name<input name="name" required /></label>
                  <label>Description<textarea name="description" required rows={4}></textarea></label>
                  <label>Short blurb<input name="shortDescription" /></label>
                  <label>Price (minor units)<input name="priceMinor" type="number" min="0" defaultValue={0} /></label>
                  <label>Currency<select name="currencyCode" defaultValue="USD"><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></label>
                  <label>Stock<input name="stockQuantity" type="number" min="0" defaultValue={0} /></label>
                  <label><input name="isFeatured" type="checkbox" /> Featured</label>
                  <label><input name="isPublished" type="checkbox" defaultChecked /> Published</label>
                  <button type="submit" className="primary-button">Create product</button>
                </form>
                {adminProducts.length === 0 ? <div className="catalog-message"><h3>No products in the catalog.</h3></div> : <div className="order-list">{adminProducts.map((product) => <article className="order-card" key={product.id}><div className="order-card-head"><strong>{product.name}</strong><span>{product.isPublished ? "Published" : "Draft"}</span></div><div className="order-meta"><span>{product.stockQuantity} in stock</span><span>{product.priceMinor} minor</span></div><div className="order-total"><strong>{product.currencyCode}</strong></div></article>)}</div>}
              </>
            )}

            {adminSection === "orders" && (
              <div className="order-list">
                {adminOrders.length === 0 ? <div className="catalog-message"><h3>No orders yet.</h3></div> : adminOrders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div className="order-card-head"><strong>#{order.id.slice(0, 8)}</strong><span>{order.status}</span></div>
                    <div className="order-meta"><span>{order.customer ? `${order.customer.displayName} · ${order.customer.email}` : "Guest checkout"}</span><span>{order.itemCount} items</span></div>
                    <div className="order-total"><strong>{formatMoney(order.totalMinor, order.currencyCode, 2)}</strong></div>
                    <label className="sort-control">
                      <span>Set status</span>
                      <select value={order.status} onChange={(event) => { void updateOrderStatus(order.id, event.target.value); }}>
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="processing">processing</option>
                        <option value="shipped">shipped</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                        <option value="refunded">refunded</option>
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            )}

            {adminSection === "customers" && (
              <div className="order-list">
                {adminCustomers.length === 0 ? <div className="catalog-message"><h3>No customers found.</h3></div> : adminCustomers.map((customer) => (
                  <article className="order-card" key={customer.id}>
                    <div className="order-card-head"><strong>{customer.displayName || "Customer"}</strong><span>{customer.emailVerified ? "Verified" : "Unverified"}</span></div>
                    <div className="order-meta"><span>{customer.email}</span><span>{customer.roles.join(", ") || "No roles"}</span></div>
                    <div className="order-total"><strong>{new Date(customer.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</strong></div>
                  </article>
                ))}
              </div>
            )}

            {adminSection === "coupons" && (
              <>
                <form className="coupon-form" onSubmit={createCoupon}>
                  <label>Code<input name="code" required /></label>
                  <label>Percent off<input name="percentOff" type="number" min="0" max="100" /></label>
                  <label>Amount off (minor)<input name="amountOffMinor" type="number" min="0" /></label>
                  <label>Currency<select name="currencyCode" defaultValue="USD"><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></label>
                  <label>Minimum subtotal<input name="minimumSubtotalMinor" type="number" min="0" defaultValue={0} /></label>
                  <label>Usage limit<input name="usageLimit" type="number" min="1" /></label>
                  <label>Starts<input name="startsAt" type="date" /></label>
                  <label>Expires<input name="expiresAt" type="date" /></label>
                  <label><input name="isEnabled" type="checkbox" defaultChecked /> Enabled</label>
                  <button type="submit" className="primary-button">Create coupon</button>
                </form>
                {adminCoupons.length === 0 ? <div className="catalog-message"><h3>No coupons created.</h3></div> : <div className="order-list">{adminCoupons.map((coupon) => <article className="order-card" key={coupon.id}><div className="order-card-head"><strong>{coupon.code}</strong><span>{coupon.isEnabled ? "Enabled" : "Disabled"}</span></div><div className="order-meta"><span>{coupon.percentOff !== null ? `${coupon.percentOff}%` : `${coupon.amountOffMinor ?? 0} minor`}</span><span>{coupon.usedCount} used</span></div><div className="order-total"><strong>{coupon.currencyCode ?? "—"}</strong></div></article>)}</div>}
              </>
            )}
          </section>
        ) : (
          <section className="standard-section">
            <p className="eyebrow">Your account</p>
            <h2>Welcome back, {account.displayName}</h2>
            <p className="gate-copy">{account.email}</p>
            {accountOrders.length === 0 ? (
              <div className="catalog-message"><h3>No orders yet.</h3><p>Your order history will appear here after you complete a purchase.</p></div>
            ) : (
              <div className="order-list">
                {accountOrders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div className="order-card-head"><strong>#{order.id.slice(0, 8)}</strong><span>{new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span></div>
                    <div className="order-meta"><span>Status: {order.status}</span><span>Payment: {order.paymentStatus}</span><span>{order.itemCount} item{order.itemCount === 1 ? "" : "s"}</span></div>
                    <div className="order-total"><strong>{formatMoney(order.totalMinor, order.currencyCode, 2)}</strong>{order.shippingMethodName && <span>{order.shippingMethodName}</span>}</div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    );
  }

  if (productState === "loading") return <main className="store-shell"><p className="loading-state">Opening the product…</p></main>;
  if (productState === "error") return <main className="store-shell"><p className="eyebrow">Product details</p><h1>We couldn’t open that piece.</h1><p className="error-note">{productError}</p><button className="primary-button back-button" onClick={backToCatalog}>Back to collection</button></main>;
  if (selectedProduct) {
    return <main className="store-shell"><header className="store-header"><button className="wordmark" onClick={backToCatalog}>serein<span>.</span></button><button className="account-link" onClick={() => void openCart()}>Cart {cart?.items?.length ? `(${cart.items.length})` : ""}</button></header><button className="back-link" type="button" onClick={backToCatalog}>← Back to collection</button><section className="product-detail"><div className="detail-gallery">{selectedProduct.images.length ? selectedProduct.images.map((image) => <img key={image.publicId} src={image.secureUrl} alt={image.altText} />) : <div className="image-placeholder large"><span>Product photography<br />will appear here</span></div>}</div><div className="detail-copy"><p className="eyebrow">{selectedProduct.categories.map((item) => item.name).join(" · ") || "Serein"}</p><h1>{selectedProduct.name}</h1><p className="detail-price">{formatMoney(selectedProduct.priceMinor, selectedProduct.currencyCode, selectedProduct.currencyExponent)}{selectedProduct.compareAtMinor !== null && <del>{formatMoney(selectedProduct.compareAtMinor, selectedProduct.currencyCode, selectedProduct.currencyExponent)}</del>}</p><p className="detail-description">{selectedProduct.description}</p><p className="stock-note">{selectedProduct.stockQuantity > 0 ? "In stock" : "Currently unavailable"}</p><button className="primary-button" disabled={cartBusy || selectedProduct.stockQuantity < 1} onClick={() => void addToCart(selectedProduct.id)}>{cartBusy ? "Adding…" : "Add to cart"}</button>{cartError && <p className="error-note" role="alert">{cartError}</p>}<p className="privacy-note">Discreet delivery details will be added during checkout.</p></div></section>{cartOpen && <CartPanel cart={cart} error={cartError} couponText={couponText} setCouponText={setCouponText} onClose={() => setCartOpen(false)} onQuantity={updateCartItem} onCoupon={applyCoupon} exponent={selectedProduct.currencyExponent} />}</main>;
  }

  return (
    <main className="store-shell">
      <header className="store-header">
        <button className="wordmark" type="button" onClick={backToCatalog}>serein<span>.</span></button>
        <nav aria-label="Main navigation"><a href="#collection">Shop</a><a href="#our-standard">Our standard</a></nav>
        <button className="account-link" type="button" onClick={() => void accountAction()}>{account ? "Account" : "Sign in"}</button>
        <button className="account-link" type="button" onClick={() => void openCart()}>Cart {cart?.items?.length ? `(${cart.items.length})` : ""}</button>
      </header>
      <section className="catalog-hero">
        <div><p className="eyebrow">A softer kind of self care</p><h1>Make room for<br /><i>feeling good.</i></h1><p>Thoughtful essentials for comfort, connection and the moments that are yours.</p></div>
        <div className="hero-seal"><span>✳</span><small>Chosen<br />with care</small></div>
      </section>
      <section className="catalog-section" id="collection">
        <div className="section-heading"><div><p className="eyebrow">Find your feeling</p><h2>Explore the collection</h2></div><span className="result-count">{catalogState === "ready" ? `${total} pieces` : ""}</span></div>
        <form className="catalog-tools" onSubmit={applyCatalogFilters}>
          <label className="search-control"><span aria-hidden="true">⌕</span><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search products" aria-label="Search products" /><button type="button" onClick={() => setSearchText("")} disabled={!searchText}>Clear</button></label>
          <label className="sort-control"><span>Sort</span><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} aria-label="Sort products"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price_asc" disabled={!currencyCode}>Price: low to high</option><option value="price_desc" disabled={!currencyCode}>Price: high to low</option></select></label>
          <label className="sort-control"><span>Currency</span><select value={currencyCode} onChange={(event) => { setCurrencyCode(event.target.value); setMinPriceText(""); setMaxPriceText(""); setMinPriceMinor(undefined); setMaxPriceMinor(undefined); if (!event.target.value && sort.startsWith("price_")) setSort("featured"); setPage(1); }} aria-label="Filter currency"><option value="">All currencies</option>{currencies.map((currency) => <option value={currency.code} key={currency.code}>{currency.code}</option>)}</select></label>
          <label className="sort-control"><span>Availability</span><select value={inStockOnly ? "in-stock" : "all"} onChange={(event) => { setInStockOnly(event.target.value === "in-stock"); setPage(1); }} aria-label="Filter availability"><option value="all">All items</option><option value="in-stock">In stock</option></select></label>
          <label className="price-control"><span>Min price</span><input type="number" min="0" step="any" value={minPriceText} onChange={(event) => setMinPriceText(event.target.value)} disabled={!currencyCode} aria-label="Minimum price" /></label>
          <label className="price-control"><span>Max price</span><input type="number" min="0" step="any" value={maxPriceText} onChange={(event) => setMaxPriceText(event.target.value)} disabled={!currencyCode} aria-label="Maximum price" /></label>
          <button className="apply-filters" type="submit">Apply filters</button>
        </form>
        {filterError && <p className="error-note" role="alert">{filterError}</p>}
        <div className="category-filters" aria-label="Filter by category"><button type="button" className={!categorySlug ? "active" : ""} onClick={() => { setCategorySlug(""); setPage(1); }}>All pieces</button>{categories.map((category) => <button type="button" key={category.id} className={categorySlug === category.slug ? "active" : ""} onClick={() => { setCategorySlug(category.slug); setPage(1); }}>{category.name}</button>)}</div>
        {catalogState === "loading" && <div className="catalog-message">Loading the collection…</div>}
        {catalogState === "error" && <div className="catalog-message error-panel"><p>{catalogError}</p><button type="button" className="text-button" onClick={() => void loadCatalog()}>Try again</button></div>}
        {catalogState === "ready" && products.length === 0 && <div className="catalog-message"><h3>No pieces to show yet.</h3><p>The catalogue is empty for these filters. Try another category or search.</p></div>}
        {catalogState === "ready" && products.length > 0 && <div className="product-grid">{products.map((product) => <button className="product-card" type="button" key={product.id} onClick={() => void openProduct(product.slug)}><div className="product-image">{product.images[0] ? <img src={product.images[0].secureUrl} alt={product.images[0].altText} loading="lazy" /> : <div className="image-placeholder"><span>Product photography<br />will appear here</span></div>}{product.isFeatured && <span className="product-badge">Featured</span>}</div><div className="product-info"><span className="product-brand">{product.brand?.name ?? "Serein"}</span><span className="product-name">{product.name}</span><span className="product-description">{product.shortDescription ?? product.categories[0]?.name ?? "Thoughtfully chosen."}</span><span className="product-price">{formatMoney(product.priceMinor, product.currencyCode, product.currencyExponent)}{product.compareAtMinor !== null && <del>{formatMoney(product.compareAtMinor, product.currencyCode, product.currencyExponent)}</del>}</span></div></button>)}</div>}
        {catalogState === "ready" && pageCount > 1 && <div className="pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></div>}
      </section>
      <section className="standard-section" id="our-standard"><p className="eyebrow">The Serein standard</p><h2>Thoughtful in every detail.</h2><div className="standard-grid"><article><span>✧</span><h3>Your privacy, always</h3><p>Discreet by design, from browsing through delivery.</p></article><article><span>◌</span><h3>Chosen with care</h3><p>Considered materials, clear details and a calm way to explore.</p></article><article><span>♡</span><h3>Here to help</h3><p>Questions are welcome. Your comfort comes first.</p></article></div></section>
      <footer className="store-footer"><span className="wordmark">serein<span>.</span></span><span>Private by design · Intimacy, considered</span><span>Development preview</span></footer>
      {cartOpen && <CartPanel cart={cart} error={cartError} couponText={couponText} setCouponText={setCouponText} onClose={() => setCartOpen(false)} onQuantity={updateCartItem} onCoupon={applyCoupon} exponent={currencies.find((item) => item.code === cart?.currencyCode)?.minorUnitExponent ?? 0} />}
    </main>
  );
}

function CartPanel({ cart, error, couponText, setCouponText, onClose, onQuantity, onCoupon, exponent }: { cart: any; error: string; couponText: string; setCouponText: (value: string) => void; onClose: () => void; onQuantity: (id: string, quantity: number) => void; onCoupon: (event: FormEvent<HTMLFormElement>) => void; exponent: number }) {
  return <aside className="cart-drawer" aria-label="Shopping cart"><button className="auth-back" onClick={onClose}>Close ×</button><h2>Your cart</h2>{cart?.items?.length ? cart.items.map((item: any) => <article className="cart-line" key={item.productId}>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <div className="cart-thumb" />}<div><strong>{item.name}</strong><p>{formatMoney(item.priceMinor, item.currencyCode, exponent)}</p><button onClick={() => onQuantity(item.productId, item.quantity - 1)}>−</button><span>{item.quantity}</span><button onClick={() => onQuantity(item.productId, item.quantity + 1)}>+</button><button onClick={() => onQuantity(item.productId, 0)}>Remove</button></div></article>) : <p>Your cart is empty.</p>}{cart && <><form className="coupon-form" onSubmit={onCoupon}><label>Discount code<input value={couponText} onChange={(event) => setCouponText(event.target.value)} /></label><button type="submit">Apply</button></form><p>Subtotal <strong>{formatMoney(cart.subtotalMinor, cart.currencyCode ?? "XXX", exponent)}</strong></p><p>Discount <strong>−{formatMoney(cart.discountMinor, cart.currencyCode ?? "XXX", exponent)}</strong></p><p>Shipping <strong>{formatMoney(cart.shippingMinor, cart.currencyCode ?? "XXX", exponent)}</strong></p><p>Total <strong>{formatMoney(cart.totalMinor, cart.currencyCode ?? "XXX", exponent)}</strong></p></>}{error && <p className="error-note" role="alert">{error}</p>}<p className="status-note">Checkout will be available in a later step.</p></aside>;
}
