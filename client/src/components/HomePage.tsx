import { useState } from "react";
import { Icon } from "./Icons";
import { ProductArt } from "./ProductArt";
import { ProductCard } from "./ProductCard";
import { categoryPresentation } from "../data/demo";
import type { Category, Product } from "../types";

type HomePageProps = {
  products: Product[];
  categories: Category[];
  onCategory: (slug: string) => void;
  onOpenProduct: (slug: string) => void;
  onAddToCart: (product: Product) => void;
  wishlist: Set<string>;
  onToggleWishlist: (product: Product) => void;
  onShopAll: () => void;
  onNewIn: () => void;
  onSale: () => void;
};

type TrendingTab = "bestsellers" | "new" | "sale";

const testimonials = [
  {
    quote: "The packaging was so discreet I almost forgot what was inside. Almost. Beautiful quality, too.",
    name: "Megan, Bristol",
    stars: 5,
  },
  {
    quote: "Finally, a shop that explains things without making it weird. The advice team is genuinely lovely.",
    name: "Sam, Manchester",
    stars: 5,
  },
  {
    quote: "We bought the Discovery Kit for our anniversary. Best decision we’ve made in a while.",
    name: "Alex & Priya, London",
    stars: 5,
  },
];

export function HomePage({
  products,
  categories,
  onCategory,
  onOpenProduct,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  onShopAll,
  onNewIn,
  onSale,
}: HomePageProps) {
  const [tab, setTab] = useState<TrendingTab>("bestsellers");

  const bestsellers = products.filter((product) => product.isFeatured);
  const newIn = products.filter((product) => product.badge?.toLowerCase() === "new");
  const sale = products.filter((product) => product.compareAtMinor !== null);
  const pool = (tab === "bestsellers" ? bestsellers : tab === "new" ? newIn : sale).length
    ? tab === "bestsellers"
      ? bestsellers
      : tab === "new"
        ? newIn
        : sale
    : products;
  const trending = pool.slice(0, 4);
  const tiles = categories.slice(0, 6);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Pleasure, without the awkward</p>
            <h1>
              Good vibes,
              <br />
              <em>delivered.</em>
            </h1>
            <p className="hero-lede">
              Body-safe toys, beautiful lingerie and everything in between. Chosen by real people, reviewed by
              thousands, and posted in plain packaging.
            </p>
            <div className="hero-actions">
              <button className="button primary" type="button" onClick={onShopAll}>
                Shop bestsellers <Icon name="arrow-right" size={17} />
              </button>
              <button className="button ghost" type="button" onClick={onNewIn}>Explore new in</button>
            </div>
            <div className="hero-proof">
              <span className="stars" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((star) => <Icon key={star} name="star" size={15} filled />)}
              </span>
              <p><strong>4.9/5</strong> from 25,000+ happy customers</p>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-glow" />
            <div className="hero-dot hero-dot-one" />
            <div className="hero-dot hero-dot-two" />
            <div className="hero-card hero-card-main">
              <ProductArt variant="wand" tone="pink" label="" />
              <span className="hero-card-label">Bestseller</span>
            </div>
            <div className="hero-card hero-card-small hero-card-top">
              <ProductArt variant="lube" tone="sage" label="" />
            </div>
            <div className="hero-card hero-card-small hero-card-bottom">
              <ProductArt variant="ring" tone="lilac" label="" />
            </div>
            <div className="hero-bubble hero-bubble-rating">
              <span>★ 4.9</span>
              <small>25k+ reviews</small>
            </div>
            <div className="hero-bubble hero-bubble-delivery">
              <Icon name="truck" size={18} />
              <span>Discreet delivery</span>
            </div>
          </div>
        </div>
        <div className="hero-marquee" aria-hidden="true">
          <span>LOVE YOURSELF FIRST</span><i>✳</i><span>BODY-SAFE MATERIALS</span><i>✳</i><span>NO JUDGEMENT</span><i>✳</i><span>DISCREET ALWAYS</span><i>✳</i>
          <span>LOVE YOURSELF FIRST</span><i>✳</i><span>BODY-SAFE MATERIALS</span><i>✳</i><span>NO JUDGEMENT</span><i>✳</i><span>DISCREET ALWAYS</span><i>✳</i>
        </div>
      </section>

      <section className="trust-bar" aria-label="Why shop with Serein">
        <div className="container trust-grid">
          <div><Icon name="truck" size={25} /><span><strong>Free delivery over £40</strong><small>Tracked to your door</small></span></div>
          <div><Icon name="shield" size={25} /><span><strong>100% discreet</strong><small>Plain packaging, private billing</small></span></div>
          <div><Icon name="refresh" size={25} /><span><strong>60-day returns</strong><small>No awkward questions</small></span></div>
          <div><Icon name="headset" size={25} /><span><strong>Real human advice</strong><small>Here 7 days a week</small></span></div>
        </div>
      </section>

      <section className="section category-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Find your thing</p>
              <h2>Shop by category</h2>
            </div>
            <button className="text-link" type="button" onClick={onShopAll}>
              Shop all <Icon name="arrow-right" size={15} />
            </button>
          </div>
          <div className="category-tiles">
            {tiles.map((category) => {
              const meta = categoryPresentation[category.slug] ?? {
                icon: "sparkle" as const,
                art: "default" as const,
                tone: "pink",
                blurb: category.description ?? "Explore the edit",
              };
              return (
                <button className="category-tile" type="button" key={category.id} onClick={() => onCategory(category.slug)}>
                  <span className="category-art" aria-hidden="true">
                    <ProductArt variant={meta.art} tone={meta.tone} label="" />
                  </span>
                  <span className="category-overlay" />
                  <span className="category-copy">
                    <span className="category-icon"><Icon name={meta.icon} size={19} /></span>
                    <strong>{category.name}</strong>
                    <small>{meta.blurb}</small>
                  </span>
                  <span className="category-arrow"><Icon name="arrow-right" size={16} /></span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section trending-section">
        <div className="container">
          <div className="section-heading trending-heading">
            <div>
              <p className="eyebrow">Everybody’s talking about</p>
              <h2>Popular right now</h2>
            </div>
            <div className="tab-buttons" role="tablist" aria-label="Popular products">
              <button className={tab === "bestsellers" ? "active" : ""} type="button" role="tab" aria-selected={tab === "bestsellers"} onClick={() => setTab("bestsellers")}>Bestsellers</button>
              <button className={tab === "new" ? "active" : ""} type="button" role="tab" aria-selected={tab === "new"} onClick={() => setTab("new")}>New in</button>
              <button className={tab === "sale" ? "active" : ""} type="button" role="tab" aria-selected={tab === "sale"} onClick={() => setTab("sale")}>On sale</button>
            </div>
          </div>
          <div className="product-row">
            {trending.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpen={onOpenProduct}
                onAdd={onAddToCart}
                wishlisted={wishlist.has(product.id)}
                onWishlist={onToggleWishlist}
              />
            ))}
          </div>
          <div className="center-action">
            <button className="button outline" type="button" onClick={tab === "new" ? onNewIn : tab === "sale" ? onSale : onShopAll}>
              {tab === "new" ? "Shop new in" : tab === "sale" ? "Shop the sale" : "Shop all products"}
              <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      </section>

      <section className="section promo-section">
        <div className="container promo-grid">
          <article className="promo-card promo-couples">
            <div className="promo-copy">
              <p className="eyebrow light">Better together</p>
              <h2>Couples who play together…</h2>
              <p>Small additions, big sparks. Explore the pieces designed for shared discovery.</p>
              <button className="button light" type="button" onClick={() => onCategory("for-couples")}>Shop for couples <Icon name="arrow-right" size={16} /></button>
            </div>
            <div className="promo-art" aria-hidden="true"><ProductArt variant="ring" tone="peach" label="" /></div>
          </article>

          <article className="promo-card promo-wellness">
            <div className="promo-copy">
              <p className="eyebrow">The wind-down edit</p>
              <h2>Make time for you.</h2>
              <p>Warm oils, quiet massagers and little rituals that make the day feel softer.</p>
              <button className="button dark" type="button" onClick={() => onCategory("wellness")}>Shop wellness <Icon name="arrow-right" size={16} /></button>
            </div>
            <div className="promo-art" aria-hidden="true"><ProductArt variant="candle" tone="sage" label="" /></div>
          </article>
        </div>
      </section>

      <section className="section reviews-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The glow-up is real</p>
              <h2>Real people. Really good reviews.</h2>
            </div>
            <div className="overall-rating">
              <span className="stars" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((star) => <Icon key={star} name="star" size={18} filled />)}
              </span>
              <strong>4.9</strong>
              <small>25,041 reviews</small>
            </div>
          </div>
          <div className="review-grid">
            {testimonials.map((testimonial) => (
              <article className="review-card" key={testimonial.name}>
                <span className="stars" aria-label={`${testimonial.stars} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((star) => <Icon key={star} name="star" size={15} filled={star <= testimonial.stars} />)}
                </span>
                <blockquote>“{testimonial.quote}”</blockquote>
                <div className="review-meta">
                  <span>{testimonial.name}</span>
                  <span className="verified"><Icon name="check" size={12} /> Verified buyer</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section values-section">
        <div className="container values-inner">
          <div className="values-copy">
            <p className="eyebrow">The Serein standard</p>
            <h2>Pleasure should feel good. Full stop.</h2>
            <p>
              Every product is checked for body-safe materials, clear instructions and honest reviews. No hype,
              no hard sell — just good things, chosen with care.
            </p>
            <button className="text-link" type="button" onClick={onShopAll}>Meet the collection <Icon name="arrow-right" size={15} /></button>
          </div>
          <div className="values-list">
            <div><span className="value-icon"><Icon name="leaf" size={22} /></span><div><strong>Body-safe by default</strong><p>Skin-friendly, non-toxic materials — and clear labelling, always.</p></div></div>
            <div><span className="value-icon"><Icon name="lock" size={22} /></span><div><strong>Private, not precious</strong><p>Discreet packaging, plain billing and no judgement at checkout.</p></div></div>
            <div><span className="value-icon"><Icon name="heart" size={22} /></span><div><strong>Here for the awkward questions</strong><p>Real humans, real advice, and a 60-day returns policy.</p></div></div>
          </div>
        </div>
      </section>
    </>
  );
}
