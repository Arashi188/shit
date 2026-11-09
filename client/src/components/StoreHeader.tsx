import { useState, type FormEvent } from "react";
import { Icon } from "./Icons";
import type { Category } from "../types";

type StoreHeaderProps = {
  categories: Category[];
  searchText: string;
  cartCount: number;
  wishlistCount: number;
  accountLabel: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onHome: () => void;
  onCategory: (slug: string) => void;
  onAllProducts: () => void;
  onNewIn: () => void;
  onSale: () => void;
  onWishlist: () => void;
  onAccount: () => void;
  onCart: () => void;
};

export function StoreHeader({
  categories,
  searchText,
  cartCount,
  wishlistCount,
  accountLabel,
  onSearchChange,
  onSearchSubmit,
  onHome,
  onCategory,
  onAllProducts,
  onNewIn,
  onSale,
  onWishlist,
  onAccount,
  onCart,
}: StoreHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(true);
  const navCategories = categories.slice(0, 6);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearchSubmit();
  }

  function chooseCategory(slug: string) {
    setMenuOpen(false);
    onCategory(slug);
  }

  return (
    <>
      {announcementOpen && (
        <div className="announcement-bar">
          <div className="container announcement-inner">
            <p>
              <Icon name="truck" size={15} />
              <span>Free UK delivery over £40</span>
              <span className="announcement-sep">·</span>
              <span>Discreet packaging, always</span>
            </p>
            <div className="announcement-links">
              <button type="button" onClick={() => onCategory("")}>Track order</button>
              <button type="button" onClick={() => onCategory("")}>Help</button>
            </div>
            <button className="announcement-close" type="button" aria-label="Dismiss announcement" onClick={() => setAnnouncementOpen(false)}>
              <Icon name="close" size={14} />
            </button>
          </div>
        </div>
      )}

      <header className="site-header">
        <div className="header-main container">
          <button className="menu-toggle" type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <Icon name={menuOpen ? "close" : "menu"} size={23} />
          </button>

          <button className="logo" type="button" onClick={onHome} aria-label="Serein home">
            serein<span>.</span>
          </button>

          <form className="header-search" role="search" onSubmit={submit}>
            <Icon name="search" size={19} />
            <input
              type="search"
              value={searchText}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search toys, lingerie, lube & more"
              aria-label="Search products"
            />
            <button type="submit">Search</button>
          </form>

          <div className="header-actions">
            <button className="header-action" type="button" onClick={onAccount}>
              <Icon name="user" size={21} />
              <span>{accountLabel || "Account"}</span>
            </button>
            <button className="header-action" type="button" onClick={onWishlist}>
              <span className="action-icon-wrap">
                <Icon name="heart" size={21} />
                {wishlistCount > 0 && <em className="count-badge">{wishlistCount}</em>}
              </span>
              <span>Wishlist</span>
            </button>
            <button className="header-action bag-action" type="button" onClick={onCart}>
              <span className="action-icon-wrap">
                <Icon name="bag" size={21} />
                {cartCount > 0 && <em className="count-badge">{cartCount}</em>}
              </span>
              <span>Bag</span>
            </button>
          </div>
        </div>

        <form className="mobile-search container" role="search" onSubmit={submit}>
          <Icon name="search" size={18} />
          <input
            type="search"
            value={searchText}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search the collection"
            aria-label="Search products"
          />
        </form>

        <nav className="main-nav" aria-label="Shop categories">
          <div className="container nav-inner">
            <button className="nav-link nav-all" type="button" onClick={onAllProducts}>Shop all</button>
            {navCategories.map((category) => (
              <button className="nav-link" type="button" key={category.id} onClick={() => onCategory(category.slug)}>
                {category.name}
              </button>
            ))}
            <button className="nav-link" type="button" onClick={onNewIn}>New in</button>
            <button className="nav-link nav-sale" type="button" onClick={onSale}>Sale</button>
          </div>
        </nav>

        {menuOpen && (
          <div className="mobile-menu">
            <div className="container">
              <p className="mobile-menu-title">Shop by category</p>
              <div className="mobile-menu-grid">
                <button type="button" onClick={() => chooseCategory("")}>Shop all</button>
                {categories.map((category) => (
                  <button type="button" key={category.id} onClick={() => chooseCategory(category.slug)}>
                    {category.name}
                  </button>
                ))}
              </div>
              <div className="mobile-menu-links">
                <button type="button" onClick={() => { setMenuOpen(false); onNewIn(); }}>New in</button>
                <button type="button" onClick={() => { setMenuOpen(false); onSale(); }}>Sale</button>
                <button type="button" onClick={() => { setMenuOpen(false); onAccount(); }}>{accountLabel || "Sign in"}</button>
                <button type="button" onClick={() => { setMenuOpen(false); onWishlist(); }}>Wishlist ({wishlistCount})</button>
                <button type="button" onClick={() => { setMenuOpen(false); onCart(); }}>Bag ({cartCount})</button>
              </div>
              <p className="mobile-menu-note"><Icon name="lock" size={14} /> Discreet delivery and billing, always.</p>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
