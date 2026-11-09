import type { FormEvent } from "react";
import { Icon } from "./Icons";
import { ProductArt } from "./ProductArt";
import type { GateStatus } from "../types";

type AgeGateProps = {
  status: GateStatus;
  confirmedAdult: boolean;
  gateError: string;
  previewMode: boolean;
  onConfirmedChange: (value: boolean) => void;
  onAccept: (event: FormEvent<HTMLFormElement>) => void;
  onDecline: () => void;
  onRetry: () => void;
};

export function AgeGate({ status, confirmedAdult, gateError, previewMode, onConfirmedChange, onAccept, onDecline, onRetry }: AgeGateProps) {
  return (
    <main className="gate-shell">
      <section className="gate-card" aria-labelledby="gate-title" aria-live="polite">
        <div className="gate-visual">
          <span className="gate-logo">serein<span>.</span></span>
          <div className="gate-visual-art" aria-hidden="true">
            <ProductArt variant="wand" tone="pink" label="" />
            <ProductArt variant="lube" tone="sage" label="" />
            <ProductArt variant="candle" tone="peach" label="" />
          </div>
          <div className="gate-quote">
            <span className="stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => <Icon key={star} name="star" size={14} filled />)}
            </span>
            <p>“Pleasure, without the awkward.”</p>
            <small>Body-safe · Discreet · Judgement-free</small>
          </div>
        </div>

        <div className="gate-content">
          <p className="eyebrow">A considered space for adults</p>
          <h1 id="gate-title">Come in, you’re among friends.</h1>
          <p className="gate-copy">
            Serein is an intimate wellness store for grown-ups. Please confirm you are 18 or older
            (or the age of majority where you live) to continue.
          </p>

          {previewMode && (
            <p className="preview-note">
              <Icon name="sparkle" size={15} /> Preview mode is on — the API is offline, so access is checked locally.
            </p>
          )}

          {status === "checking" && <p className="status-note"><span className="spinner" aria-hidden="true" /> Checking your access…</p>}
          {status === "unavailable" && (
            <div className="gate-offline">
              <p className="status-note">We can’t confirm access right now.</p>
              <button className="button outline" type="button" onClick={onRetry}>Try again</button>
            </div>
          )}

          {(status === "required" || status === "unavailable") && (
            <form className="gate-form" onSubmit={onAccept}>
              <label className="age-check">
                <input type="checkbox" checked={confirmedAdult} onChange={(event) => onConfirmedChange(event.target.checked)} />
                <span>I am 18 or older (or the age of majority where I live).</span>
              </label>
              <button className="button primary gate-continue" type="submit" disabled={!confirmedAdult}>
                Continue to Serein <Icon name="arrow-right" size={17} />
              </button>
            </form>
          )}

          {status === "required" && (
            <button className="text-button" type="button" onClick={onDecline}>I am under 18</button>
          )}

          {gateError && <p className="form-error" role="alert">{gateError}</p>}

          <div className="gate-trust">
            <span><Icon name="lock" size={14} /> Private by design</span>
            <span><Icon name="shield" size={14} /> Secure, discreet checkout</span>
          </div>
          <small className="gate-legal">
            Your confirmation is stored privately in a secure, signed cookie. Requirements may vary by location.
          </small>
        </div>
      </section>
    </main>
  );
}
