"use client";

import { useScrimLock } from "@/hooks/useScrimLock";
import { fmtBal, fmtPct } from "@/lib/format";

import type { ClaimApiRecord } from "./ClaimStatusPanel";

type Holder = {
  a: string;
  b: number;
  p: number;
  r: number;
  tx: { t: string }[];
};

function IconClose() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

type Props = {
  open: boolean;
  holder: Holder;
  claim: ClaimApiRecord | undefined;
  kycThreshold: number;
  onClose: () => void;
  onProceed: () => void | Promise<void>;
};

export function MatchedModal({ open, holder, claim, kycThreshold, onClose, onProceed }: Props) {
  useScrimLock(open, onClose);

  if (!open) return null;

  const above = holder.b > kycThreshold;
  const txCount = holder.tx.length;
  const lastTx = txCount ? new Date(holder.tx[txCount - 1]!.t).toLocaleString() : "—";

  return (
    <div
      className={`scrim${open ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="matched-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="panel panel-large" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h3 id="matched-title">You&apos;re on the list.</h3>
            <p style={{ margin: 0 }}>Your wallet matches an eligible address. Review the details below and proceed to claim.</p>
          </div>
          <button type="button" className="close-x" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div id="matched-body">
          {claim ? (
            <div
              style={{
                background: claim.status === "pending" ? "var(--pending-bg)" : "var(--ok-bg)",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${claim.status === "pending" ? "var(--pending-border)" : "var(--ok-border)"}`,
                color: claim.status === "pending" ? "var(--pending-ink)" : "var(--ok-ink)",
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              <b style={{ fontWeight: 500 }}>
                {claim.status === "pending" ? "Pending verification" : "Already claimed"}
              </b>
              {claim.ts ? <> · submitted {new Date(claim.ts).toLocaleString()}</> : null}
            </div>
          ) : null}
          <div className="matched-card">
            <div className="addr">{holder.a}</div>
            <div className="amt">
              {fmtBal(holder.b)} <span style={{ fontSize: 14, color: "var(--ink-muted)", marginLeft: 4 }}>wINC</span>
            </div>
            <div className="meta">
              <span>
                <b>Rank</b> #{holder.r}
              </span>
              <span>
                <b>Share</b> {fmtPct(holder.p)}%
              </span>
              <span>
                <b>Buy txs</b> {txCount}
              </span>
              <span>
                <b>Last activity</b> {lastTx}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55, marginBottom: 18 }}>
            {above ? (
              <p style={{ margin: 0 }}>
                Your balance is above {kycThreshold} wINC, so identity verification is required before the Inception 2.0
                airdrop is released. Submit your details and we will contact you within 5 business days.
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                Your balance is at or below {kycThreshold} wINC. Confirm to register your claim — the airdrop will be
                sent to this same address.
              </p>
            )}
          </div>
          <div className="form-actions" style={{ justifyContent: "flex-start" }}>
            <button
              type="button"
              className="btn primary"
              id="proceed-claim"
              disabled={Boolean(claim)}
              onClick={() => {
                if (claim) return;
                void onProceed();
              }}
            >
              {claim
                ? claim.status === "pending"
                  ? "Pending verification"
                  : "Claimed"
                : above
                  ? "Continue to KYC →"
                  : "Confirm claim"}
            </button>
            <button type="button" className="btn ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
