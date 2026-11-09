import type { FormEvent } from "react";
import { Icon } from "./Icons";
import { ProductArt } from "./ProductArt";
import type { Account } from "../types";

type AuthMode = "login" | "register" | "verify";

type AuthScreenProps = {
  mode: AuthMode;
  account: Account | null;
  busy: boolean;
  error: string;
  message: string;
  verifyToken: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onVerify: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
  onBack: () => void;
  onSwitchMode: (mode: AuthMode) => void;
};

export function AuthScreen({ mode, account, busy, error, message, verifyToken, onSubmit, onVerify, onResend, onBack, onSwitchMode }: AuthScreenProps) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-visual">
          <span className="gate-logo">serein<span>.</span></span>
          <div className="auth-visual-art" aria-hidden="true">
            <ProductArt variant="rabbit" tone="berry" label="" />
          </div>
          <div className="auth-visual-copy">
            <p className="eyebrow light">Your private space</p>
            <h2>Keep the good stuff together.</h2>
            <p>Save your favourites, track orders and get first dibs on new arrivals.</p>
            <ul>
              <li><Icon name="heart" size={15} /> Your wishlist, always here</li>
              <li><Icon name="truck" size={15} /> Track every discreet delivery</li>
              <li><Icon name="sparkle" size={15} /> Early access to the good stuff</li>
            </ul>
          </div>
        </div>

        <div className="auth-content">
          <button type="button" className="auth-back" onClick={onBack}>
            <Icon name="chevron-left" size={15} /> Back to Serein
          </button>

          {mode === "verify" ? (
            <>
              <p className="eyebrow">One last step</p>
              <h1>Verify your email.</h1>
              <p className="auth-lede">
                We sent a verification link to <strong>{account?.email ?? "your inbox"}</strong>. Use the button in the email to verify your account, or paste the code below.
              </p>
              <form className="auth-form" onSubmit={onVerify}>
                <label>
                  Verification code
                  <input name="token" defaultValue={verifyToken} placeholder="Paste your verification token" required autoComplete="one-time-code" />
                </label>
                <button className="button primary" type="submit" disabled={busy}>{busy ? "Checking…" : "Verify email"}</button>
              </form>
              {account?.email && (
                <button type="button" className="text-button" onClick={onResend}>Resend the email</button>
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">{mode === "register" ? "Join the club" : "Welcome back"}</p>
              <h1>{mode === "register" ? "Create your account." : "Good to see you again."}</h1>
              <p className="auth-lede">
                {mode === "register"
                  ? "A thoughtful place to keep your details, favourites and orders together."
                  : "Sign in to see your saved items, orders and the good stuff you left behind."}
              </p>

              <form className="auth-form" onSubmit={onSubmit}>
                {mode === "register" && (
                  <label>
                    Your name
                    <input name="displayName" required minLength={1} maxLength={120} autoComplete="name" placeholder="How should we call you?" />
                  </label>
                )}
                <label>
                  Email address
                  <input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={mode === "register" ? 12 : 1}
                    maxLength={128}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    placeholder="At least 12 characters"
                  />
                  {mode === "register" && <small>Use at least 12 characters. Make it memorable, not guessable.</small>}
                </label>
                <button className="button primary" type="submit" disabled={busy}>
                  {busy ? "Please wait…" : mode === "register" ? "Create my account" : "Sign in"}
                </button>
              </form>

              <div className="auth-switch">
                {mode === "register" ? (
                  <p>Already have an account? <button type="button" onClick={() => onSwitchMode("login")}>Sign in instead</button></p>
                ) : (
                  <p>New here? <button type="button" onClick={() => onSwitchMode("register")}>Create an account</button></p>
                )}
              </div>
            </>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="status-note" role="status">{message}</p>}

          <p className="auth-legal">
            By continuing you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>. You must be 18+.
          </p>
        </div>
      </section>
    </main>
  );
}
