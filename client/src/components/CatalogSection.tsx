import { useState, type FormEvent } from "react";
import { Icon } from "./Icons";
import { ProductCard } from "./ProductCard";
import type { Category, Currency, Product } from "../types";

type CatalogState = "loading" | "ready" | "error";

type CatalogSectionProps = {
  products: Product[];
  categories: Category[];
  currencies: Currency[];
  total: number;
  page: number;
  pageCount: number;
  catalogState: CatalogState;
  catalogError: string;
  categorySlug: string;
  query: string;
  sort: string;
  inStockOnly: boolean;
  currencyCode: string;
  minPriceText: string;
  maxPriceText: string;
  filterError: string;
  showWishlist: boolean;
  saleOnly: boolean;
  wishlist: Set<string>;
  onCategoryChange: (slug: string) => void;
  onSortChange: (sort: string) => void;
  onStockChange: (value: boolean) => void;
  onCurrencyChange: (code: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onApplyFilters: (event: FormEvent<HTMLFormElement>) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onOpenProduct: (slug: string) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  onClearSpecial: () => void;
};

function pageNumbers(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(current - 2, total - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

export function CatalogSection(props: CatalogSectionProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCategory = props.categories.find((category) => category.slug === props.categorySlug);
  const title = props.showWishlist
    ? "Your wishlist"
    : props.saleOnly
      ? "The sale edit"
      : props.query
        ? `Results for “${props.query}”`
        : activeCategory?.name ?? "All the good stuff";
  const subtitle = props.showWishlist
    ? "Saved for later. Your little list of good ideas."
    : props.saleOnly
      ? "The pieces we love, now with a little less on the price tag."
      : activeCategory?.description ?? "Thoughtfully chosen intimate wellness, lingerie and play essentials.";

  const hasFilters = Boolean(
    props.categorySlug || props.query || props.inStockOnly || props.minPriceText || props.maxPriceText || props.showWishlist || props.saleOnly,
  );

  function apply(event: FormEvent<HTMLFormElement>) {
    props.onApplyFilters(event);
    setFiltersOpen(false);
  }

  return (
    <section className="section catalog-section" id="shop">
      <div className="container">
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">Shop Serein</p>
            <h2>{title}</h2>
            <p className="catalog-subtitle">{subtitle}</p>
          </div>
          <span className="result-count">
            {props.catalogState === "ready" ? `${props.total} ${props.total === 1 ? "product" : "products"}` : ""}
          </span>
        </div>

        <div className="catalog-layout">
          {filtersOpen && <div className="filter-backdrop" onClick={() => setFiltersOpen(false)} aria-hidden="true" />}
          <aside className={filtersOpen ? "filters-panel open" : "filters-panel"} aria-label="Product filters">
            <div className="filters-head">
              <h3>Filters</h3>
              <button className="filters-close" type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="filter-group">
              <h4>Category</h4>
              <div className="filter-list">
                <label>
                  <input type="radio" name="category" checked={!props.categorySlug} onChange={() => props.onCategoryChange("")} />
                  <span>All products</span>
                </label>
                {props.categories.map((category) => (
                  <label key={category.id}>
                    <input
                      type="radio"
                      name="category"
                      checked={props.categorySlug === category.slug}
                      onChange={() => props.onCategoryChange(category.slug)}
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <form onSubmit={apply}>
              <div className="filter-group">
                <h4>Price</h4>
                <label className="filter-currency">
                  <span>Currency</span>
                  <select value={props.currencyCode} onChange={(event) => props.onCurrencyChange(event.target.value)}>
                    <option value="">All</option>
                    {props.currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>{currency.code}</option>
                    ))}
                  </select>
                </label>
                <div className="price-inputs">
                  <label>
                    <span>Min</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={props.minPriceText}
                      onChange={(event) => props.onMinPriceChange(event.target.value)}
                      placeholder="0"
                      disabled={!props.currencyCode}
                    />
                  </label>
                  <span className="price-dash">–</span>
                  <label>
                    <span>Max</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={props.maxPriceText}
                      onChange={(event) => props.onMaxPriceChange(event.target.value)}
                      placeholder="200"
                      disabled={!props.currencyCode}
                    />
                  </label>
                </div>
                {!props.currencyCode && <p className="filter-hint">Choose a currency to filter by price.</p>}
              </div>

              <div className="filter-group">
                <h4>Availability</h4>
                <label className="checkbox-row">
                  <input type="checkbox" checked={props.inStockOnly} onChange={(event) => props.onStockChange(event.target.checked)} />
                  <span>In stock only</span>
                </label>
              </div>

              {props.filterError && <p className="form-error" role="alert">{props.filterError}</p>}

              <button className="button primary filter-apply" type="submit">Apply filters</button>
              <button className="filter-clear" type="button" onClick={props.onClearFilters}>Clear all filters</button>
            </form>

            <div className="filter-promo">
              <Icon name="truck" size={20} />
              <p><strong>Free delivery over £40</strong><span>Always in plain packaging.</span></p>
            </div>
          </aside>

          <div className="catalog-main">
            <div className="catalog-toolbar">
              <button className="filter-toggle" type="button" onClick={() => setFiltersOpen(true)}>
                <Icon name="filter" size={17} /> Filters
              </button>
              <div className="toolbar-summary">
                {hasFilters && <button className="clear-inline" type="button" onClick={props.onClearFilters}>Clear all</button>}
              </div>
              <label className="sort-control">
                <span>Sort by</span>
                <select value={props.sort} onChange={(event) => props.onSortChange(event.target.value)} aria-label="Sort products">
                  <option value="featured">Recommended</option>
                  <option value="newest">Newest in</option>
                  <option value="price_asc" disabled={!props.currencyCode}>Price: low to high</option>
                  <option value="price_desc" disabled={!props.currencyCode}>Price: high to low</option>
                </select>
                <Icon name="chevron-down" size={15} />
              </label>
            </div>

            {hasFilters && (
              <div className="active-filters" aria-label="Active filters">
                {props.showWishlist && <button type="button" onClick={props.onClearSpecial}><Icon name="heart" size={12} /> Wishlist <Icon name="close" size={11} /></button>}
                {props.saleOnly && <button type="button" onClick={props.onClearSpecial}><Icon name="tag" size={12} /> Sale <Icon name="close" size={11} /></button>}
                {activeCategory && <button type="button" onClick={() => props.onCategoryChange("")}>{activeCategory.name} <Icon name="close" size={11} /></button>}
                {props.query && <button type="button" onClick={props.onClearFilters}>“{props.query}” <Icon name="close" size={11} /></button>}
                {props.inStockOnly && <button type="button" onClick={() => props.onStockChange(false)}>In stock <Icon name="close" size={11} /></button>}
                {(props.minPriceText || props.maxPriceText) && (
                  <button type="button" onClick={props.onClearFilters}>
                    {props.minPriceText && `£${props.minPriceText}`}{props.minPriceText && props.maxPriceText && " – "}{props.maxPriceText && `£${props.maxPriceText}`}
                    <Icon name="close" size={11} />
                  </button>
                )}
              </div>
            )}

            {props.catalogState === "loading" && (
              <div className="product-grid" aria-busy="true" aria-label="Loading products">
                {Array.from({ length: 8 }, (_, index) => (
                  <div className="product-skeleton" key={index}>
                    <div className="skeleton-art" />
                    <div className="skeleton-line short" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line tiny" />
                  </div>
                ))}
              </div>
            )}

            {props.catalogState === "error" && (
              <div className="empty-state">
                <span className="empty-icon"><Icon name="refresh" size={28} /></span>
                <h3>We couldn’t load the collection.</h3>
                <p>{props.catalogError}</p>
                <button className="button dark" type="button" onClick={props.onRetry}>Try again</button>
              </div>
            )}

            {props.catalogState === "ready" && props.products.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon"><Icon name="search" size={28} /></span>
                <h3>{props.showWishlist ? "Nothing saved yet." : "No products match that yet."}</h3>
                <p>{props.showWishlist ? "Tap the heart on anything you like and it will live here." : "Try a different category, search or price range."}</p>
                <button className="button dark" type="button" onClick={props.onClearFilters}>Clear filters</button>
              </div>
            )}

            {props.catalogState === "ready" && props.products.length > 0 && (
              <>
                <div className="product-grid">
                  {props.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpen={props.onOpenProduct}
                      onAdd={props.onAddToCart}
                      wishlisted={props.wishlist.has(product.id)}
                      onWishlist={props.onToggleWishlist}
                    />
                  ))}
                </div>
                {props.pageCount > 1 && (
                  <nav className="pagination" aria-label="Product pages">
                    <button type="button" className="page-arrow" disabled={props.page <= 1} onClick={() => props.onPageChange(props.page - 1)} aria-label="Previous page">
                      <Icon name="chevron-left" size={17} />
                    </button>
                    {pageNumbers(props.page, props.pageCount).map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={page === props.page ? "active" : ""}
                        aria-current={page === props.page ? "page" : undefined}
                        onClick={() => props.onPageChange(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button type="button" className="page-arrow" disabled={props.page >= props.pageCount} onClick={() => props.onPageChange(props.page + 1)} aria-label="Next page">
                      <Icon name="chevron-right" size={17} />
                    </button>
                  </nav>
                )}
              </>
            )}

            <p className="catalog-footnote">
              <Icon name="lock" size={14} /> Every order is sent in plain, unbranded packaging. Prices include VAT.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
