import { useState } from "react";
import { Icon } from "./Icons";
import { ProductArt } from "./ProductArt";
import { ProductCard } from "./ProductCard";
import type { Product } from "../types";
import { discountPercent, formatMoney } from "../lib/format";

const altTones = ["pink", "sage", "peach", "lilac", "blue"];

type ProductDetailViewProps = {
  product: Product;
  related: Product[];
  wishlisted: boolean;
  wishlist: Set<string>;
  cartBusy: boolean;
  cartError: string;
  onAddToCart: (product: Product, quantity: number) => void;
  onToggleWishlist: (product: Product) => void;
  onOpenProduct: (slug: string) => void;
  onBack: () => void;
  onCategory: (slug: string) => void;
};

export function ProductDetailView({
  product,
  related,
  wishlisted,
  wishlist,
  cartBusy,
  cartError,
  onAddToCart,
  onToggleWishlist,
  onOpenProduct,
  onBack,
  onCategory,
}: ProductDetailViewProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedTone, setSelectedTone] = useState(product.tone ?? "pink");
  const saving = discountPercent(product.priceMinor, product.compareAtMinor);
  const category = product.categories[0];

  const tones = [product.tone ?? "pink", ...altTones.filter((tone) => tone !== (product.tone ?? "pink"))].slice(0, 4);

  return (
    <main className="product-detail-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={onBack}>Home</button>
          <Icon name="chevron-right" size={12} />
          {category && <button type="button" onClick={() => onCategory(category.slug)}>{category.name}</button>}
          {category && <Icon name="chevron-right" size={12} />}
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="product-detail">
          <div className="detail-gallery">
            <div className="detail-main-image">
              {product.images.length > 0 ? (
                <img src={product.images[Math.min(selectedImage, product.images.length - 1)].secureUrl} alt={product.images[Math.min(selectedImage, product.images.length - 1)].altText || product.name} />
              ) : (
                <ProductArt variant={product.art ?? "default"} tone={selectedTone} label={product.name} />
              )}
              {saving && <span className="detail-badge">Save {saving}%</span>}
              <button
                className={wishlisted ? "wish-button detail-wish active" : "wish-button detail-wish"}
                type="button"
                onClick={() => onToggleWishlist(product)}
                aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                aria-pressed={wishlisted}
              >
                <Icon name="heart" size={20} filled={wishlisted} />
              </button>
            </div>

            <div className="detail-thumbs">
              {product.images.length > 0
                ? product.images.map((image, index) => (
                    <button
                      className={selectedImage === index ? "active" : ""}
                      type="button"
                      key={image.publicId}
                      onClick={() => setSelectedImage(index)}
                      aria-label={`View image ${index + 1}`}
                    >
                      <img src={image.secureUrl} alt="" />
                    </button>
                  ))
                : tones.map((tone) => (
                    <button
                      className={selectedTone === tone ? "active" : ""}
                      type="button"
                      key={tone}
                      onClick={() => setSelectedTone(tone)}
                      aria-label={`View ${tone} colourway`}
                    >
                      <ProductArt variant={product.art ?? "default"} tone={tone} label="" />
                    </button>
                  ))}
            </div>

            <div className="detail-gallery-note">
              <Icon name="truck" size={16} /> Free UK delivery over £40 · Discreet packaging
            </div>
          </div>

          <div className="detail-copy">
            <span className="detail-brand">{product.brand?.name ?? "Serein"}</span>
            <h1>{product.name}</h1>
            {product.rating && (
              <div className="detail-rating">
                <span className="stars" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((star) => <Icon key={star} name="star" size={16} filled={star <= Math.round(product.rating ?? 0)} />)}
                </span>
                <strong>{product.rating.toFixed(1)}</strong>
                <button type="button">{(product.reviewCount ?? 0).toLocaleString("en-GB")} reviews</button>
              </div>
            )}
            <p className="detail-short">{product.shortDescription ?? product.description}</p>

            <div className="detail-price-row">
              <span className="detail-price">{formatMoney(product.priceMinor, product.currencyCode, product.currencyExponent)}</span>
              {product.compareAtMinor !== null && (
                <del>{formatMoney(product.compareAtMinor, product.currencyCode, product.currencyExponent)}</del>
              )}
              {saving && <span className="save-pill">Save {saving}%</span>}
            </div>
            <p className="stock-note">
              {product.stockQuantity > 0 ? <><span className="stock-dot" /> In stock — ready to ship</> : "Currently unavailable"}
            </p>

            <div className="detail-buy">
              <div className="qty-stepper large">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity">
                  <Icon name="minus" size={15} />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => Math.min(product.stockQuantity, value + 1))} aria-label="Increase quantity">
                  <Icon name="plus" size={15} />
                </button>
              </div>
              <button
                className="button primary add-to-bag"
                type="button"
                onClick={() => onAddToCart(product, quantity)}
                disabled={cartBusy || product.stockQuantity < 1}
              >
                <Icon name="bag" size={18} />
                {cartBusy ? "Adding…" : product.stockQuantity < 1 ? "Out of stock" : "Add to bag"}
              </button>
            </div>
            <button
              className={wishlisted ? "wishlist-text active" : "wishlist-text"}
              type="button"
              onClick={() => onToggleWishlist(product)}
            >
              <Icon name="heart" size={17} filled={wishlisted} />
              {wishlisted ? "Saved to your wishlist" : "Save to wishlist"}
            </button>
            {cartError && <p className="form-error" role="alert">{cartError}</p>}

            <div className="detail-perks">
              <span><Icon name="truck" size={17} /> Free delivery over £40</span>
              <span><Icon name="refresh" size={17} /> 60-day returns</span>
              <span><Icon name="shield" size={17} /> 1-year warranty</span>
            </div>

            <div className="detail-accordions">
              <details open>
                <summary>Product details <Icon name="chevron-down" size={16} /></summary>
                <p>{product.description}</p>
              </details>
              <details>
                <summary>Delivery & returns <Icon name="chevron-down" size={16} /></summary>
                <p>Orders placed before 8pm are dispatched the same working day. Standard UK delivery is 2–3 working days and free over £40. Returns are free within 60 days, and every parcel is sent in plain, unbranded packaging.</p>
              </details>
              <details>
                <summary>Care & materials <Icon name="chevron-down" size={16} /></summary>
                <p>Made from body-safe materials. Clean before and after use with a toy cleaner or warm water and mild soap. Use with water-based lubricant unless stated otherwise.</p>
              </details>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="related-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Keep the good vibes going</p>
                <h2>You might also like</h2>
              </div>
              <button className="text-link" type="button" onClick={onBack}>Shop all <Icon name="arrow-right" size={15} /></button>
            </div>
            <div className="product-row">
              {related.slice(0, 4).map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  onOpen={onOpenProduct}
                  onAdd={(next) => onAddToCart(next, 1)}
                  wishlisted={wishlist.has(item.id)}
                  onWishlist={onToggleWishlist}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
