import { useState, type FormEvent } from "react";
import { Icon } from "./Icons";
import type { Category } from "../types";

type StoreFooterProps = {
  categories: Category[];
  onCategory: (slug: string) => void;
  onHome: () => void;
};

const helpLinks = ["Delivery & returns", "Track your order", "Size guide", "Contact us", "FAQs"];
const aboutLinks = ["Our story", "Our standards", "Body-safe materials", "Reviews", "Careers"];

export function StoreFooter({ categories, onCategory, onHome }: StoreFooterProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  }

  return (
    <footer className="site-footer">
      <div className="footer-newsletter">
        <div className="container newsletter-inner">
          <div>
            <p className="eyebrow light">Join the inner circle</p>
            <h2>15% off your first order.</h2>
            <p>Feel-good edits, honest advice and early access. No spam, just the good stuff.</p>
          </div>
          {subscribed ? (
            <p className="newsletter-success" role="status">
              <Icon name="check" size={18} /> You’re in. Check your inbox for your code.
            </p>
          ) : (
            <form className="newsletter-form" onSubmit={subscribe}>
              <label className="sr-only" htmlFor="newsletter-email">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Your email address"
                required
              />
              <button type="submit">Get my 15% off</button>
            </form>
          )}
        </div>
      </div>

      <div className="footer-main container">
        <div className="footer-brand">
          <button className="logo footer-logo" type="button" onClick={onHome}>serein<span>.</span></button>
          <p>Intimate wellness without the awkward. Body-safe, judgement-free and delivered discreetly to your door.</p>
          <div className="footer-social" aria-label="Social links">
            <a href="#instagram" aria-label="Instagram">Instagram</a>
            <a href="#tiktok" aria-label="TikTok">TikTok</a>
            <a href="#youtube" aria-label="YouTube">YouTube</a>
          </div>
          <span className="age-pill">18+</span>
        </div>

        <div className="footer-col">
          <h3>Shop</h3>
          <button type="button" onClick={() => onCategory("")}>All products</button>
          {categories.slice(0, 5).map((category) => (
            <button type="button" key={category.id} onClick={() => onCategory(category.slug)}>{category.name}</button>
          ))}
        </div>

        <div className="footer-col">
          <h3>Help</h3>
          {helpLinks.map((link) => <a key={link} href="#help">{link}</a>)}
        </div>

        <div className="footer-col">
          <h3>About</h3>
          {aboutLinks.map((link) => <a key={link} href="#about">{link}</a>)}
        </div>

        <div className="footer-col footer-trust">
          <h3>Shop with confidence</h3>
          <p><Icon name="shield" size={18} /> 100% discreet packaging</p>
          <p><Icon name="refresh" size={18} /> 60-day returns</p>
          <p><Icon name="lock" size={18} /> Secure, encrypted checkout</p>
          <p><Icon name="headset" size={18} /> Real people, real advice</p>
        </div>
      </div>

      <div className="footer-bottom container">
        <p>© {new Date().getFullYear()} Serein. All rights reserved. You must be 18+ to purchase.</p>
        <div className="payment-badges" aria-label="Payment methods">
          <span>VISA</span>
          <span>MASTERCARD</span>
          <span>PAYPAL</span>
          <span>KLARNA</span>
          <span>APPLE PAY</span>
        </div>
        <div className="footer-legal">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#cookies">Cookies</a>
        </div>
      </div>
    </footer>
  );
}
