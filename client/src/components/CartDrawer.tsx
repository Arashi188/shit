import { useEffect, type FormEvent } from "react";
import { Icon } from "./Icons";
import { ProductArt } from "./ProductArt";
import type { Cart } from "../types";
import { formatMoney } from "../lib/format";

type CartDrawerProps = {
  cart: Cart | null;
  error: string;
  couponText: string;
  exponent: number;
  checkoutMessage: string;
  onCouponTextChange: (value: string) => void;
  onClose: () => void;
  onQuantity: (productId: string, quantity: number) => void;
  onCoupon: (event: FormEvent<HTMLFormElement>) => void;
  onCheckout: () => void;
};

const FREE_DELIVERY_MINOR = 4000;

export function CartDrawer({
  cart,
  error,
  couponText,
  exponent,
  checkoutMessage,
  onCouponTextChange,
  onClose,
  onQuantity,
  onCoupon,
  onCheckout,
}: CartDrawerProps) {
  const items = cart?.items ?? [];
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart?.subtotalMinor ?? 0;
  const remaining = Math.max(0, FREE_DELIVERY_MINOR - subtotal);
  const progress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_MINOR) * 100));
  const currency = cart?.currencyCode ?? "GBP";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="drawer-root">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Your shopping bag">
        <header className="drawer-head">
          <div>
            <p className="eyebrow">Your bag</p>
            <h2>{count} {count === 1 ? "item" : "items"}</h2>
          </div>
          <button className="drawer-close" type="button" onClick={onClose} aria-label="Close bag">
            <Icon name="close" size={22} />
          </button>
        </header>

        <div className="delivery-progress">
          <p>
            {remaining > 0 ? (
              <>You’re <strong>{formatMoney(remaining, currency, exponent)}</strong> away from free delivery.</>
            ) : (
              <><Icon name="check" size={14} /> Free delivery unlocked.</>
            )}
          </p>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <span className="empty-icon"><Icon name="bag" size={30} /></span>
              <h3>Your bag is feeling light.</h3>
              <p>Fill it with something that makes you feel good.</p>
              <button className="button primary" type="button" onClick={onClose}>Start shopping</button>
            </div>
          ) : (
            <>
              <div className="cart-lines">
                {items.map((item) => (
                  <article className="cart-line" key={item.productId}>
                    <div className="cart-thumb">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" />
                      ) : (
                        <ProductArt variant={item.art ?? "default"} tone={item.tone} label="" />
                      )}
                    </div>
                    <div className="cart-line-info">
                      <strong>{item.name}</strong>
                      <span className="cart-line-price">{formatMoney(item.priceMinor, item.currencyCode, exponent)}</span>
                      <div className="qty-row">
                        <div className="qty-stepper">
                          <button type="button" onClick={() => onQuantity(item.productId, item.quantity - 1)} aria-label={`Decrease quantity of ${item.name}`}>
                            <Icon name="minus" size={13} />
                          </button>
                          <span aria-live="polite">{item.quantity}</span>
                          <button type="button" onClick={() => onQuantity(item.productId, item.quantity + 1)} aria-label={`Increase quantity of ${item.name}`} disabled={item.quantity >= item.stockQuantity}>
                            <Icon name="plus" size={13} />
                          </button>
                        </div>
                        <button className="remove-line" type="button" onClick={() => onQuantity(item.productId, 0)}>Remove</button>
                      </div>
                    </div>
                    <span className="cart-line-total">{formatMoney(item.lineTotalMinor ?? item.priceMinor * item.quantity, item.currencyCode, exponent)}</span>
                  </article>
                ))}
              </div>

              <form className="promo-form" onSubmit={onCoupon}>
                <label htmlFor="promo-code">Have a promo code?</label>
                <div>
                  <input
                    id="promo-code"
                    value={couponText}
                    onChange={(event) => onCouponTextChange(event.target.value)}
                    placeholder="Enter code"
                    autoComplete="off"
                  />
                  <button type="submit">Apply</button>
                </div>
              </form>

              <div className="cart-summary">
                <div><span>Subtotal</span><strong>{formatMoney(cart?.subtotalMinor ?? 0, currency, exponent)}</strong></div>
                {(cart?.discountMinor ?? 0) > 0 && <div className="discount-row"><span>Discount</span><strong>−{formatMoney(cart?.discountMinor ?? 0, currency, exponent)}</strong></div>}
                <div><span>Delivery</span><strong>{(cart?.shippingMinor ?? 0) === 0 ? "Free" : formatMoney(cart?.shippingMinor ?? 0, currency, exponent)}</strong></div>
                <div className="summary-total"><span>Total</span><strong>{formatMoney(cart?.totalMinor ?? 0, currency, exponent)}</strong></div>
                <p className="vat-note">Including VAT. Delivery calculated at checkout.</p>
              </div>
            </>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        {items.length > 0 && (
          <footer className="drawer-foot">
            <button className="button primary checkout-button" type="button" onClick={onCheckout}>
              <Icon name="lock" size={16} /> Secure checkout
            </button>
            {checkoutMessage && <p className="checkout-note" role="status">{checkoutMessage}</p>}
            <div className="drawer-trust">
              <span><Icon name="shield" size={14} /> Discreet billing</span>
              <span><Icon name="refresh" size={14} /> 60-day returns</span>
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}
