import { Icon } from "./Icons";
import { ProductArt } from "./ProductArt";
import type { Product } from "../types";
import { discountPercent, formatMoney } from "../lib/format";

type ProductCardProps = {
  product: Product;
  onOpen: (slug: string) => void;
  onAdd: (product: Product) => void;
  wishlisted: boolean;
  onWishlist: (product: Product) => void;
  compact?: boolean;
};

export function ProductCard({ product, onOpen, onAdd, wishlisted, onWishlist, compact = false }: ProductCardProps) {
  const saving = discountPercent(product.priceMinor, product.compareAtMinor);
  const badge = product.badge ?? (saving ? `${saving}% off` : null);
  const rating = product.rating;
  const art = product.art ?? "default";
  const soldOut = product.stockQuantity < 1;

  return (
    <article className={compact ? "product-card compact" : "product-card"}>
      <div className="card-media-wrap">
        <button className="card-media" type="button" onClick={() => onOpen(product.slug)} aria-label={`View ${product.name}`}>
          {product.images[0] ? (
            <img src={product.images[0].secureUrl} alt={product.images[0].altText || product.name} loading="lazy" />
          ) : (
            <ProductArt variant={art} tone={product.tone} label={product.name} />
          )}
          {badge && <span className={saving ? "product-badge sale" : "product-badge"}>{badge}</span>}
        </button>
        <button
          type="button"
          className={wishlisted ? "wish-button active" : "wish-button"}
          onClick={() => onWishlist(product)}
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={wishlisted}
        >
          <Icon name="heart" size={18} filled={wishlisted} />
        </button>
        <button className="quick-add" type="button" onClick={() => onAdd(product)} disabled={soldOut}>
          <Icon name="plus" size={16} />
          <span>{soldOut ? "Sold out" : "Quick add"}</span>
        </button>
      </div>

      <div className="card-info">
        <span className="card-brand">{product.brand?.name ?? "Serein"}</span>
        <button className="card-name" type="button" onClick={() => onOpen(product.slug)}>
          {product.name}
        </button>
        {rating ? (
          <span className="card-rating" aria-label={`${rating} out of 5 stars from ${product.reviewCount ?? 0} reviews`}>
            <span className="stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon key={star} name="star" size={12} filled={star <= Math.round(rating)} />
              ))}
            </span>
            <span>{rating.toFixed(1)}</span>
            <span className="review-count">({(product.reviewCount ?? 0).toLocaleString("en-GB")})</span>
          </span>
        ) : (
          <span className="card-category">{product.categories.map((category) => category.name).join(" · ")}</span>
        )}
        <div className="card-bottom">
          <span className="card-price">
            {formatMoney(product.priceMinor, product.currencyCode, product.currencyExponent)}
            {product.compareAtMinor !== null && (
              <del>{formatMoney(product.compareAtMinor, product.currencyCode, product.currencyExponent)}</del>
            )}
          </span>
          <button
            className="card-add"
            type="button"
            onClick={() => onAdd(product)}
            aria-label={`Add ${product.name} to bag`}
            disabled={product.stockQuantity < 1}
          >
            <Icon name="bag" size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
