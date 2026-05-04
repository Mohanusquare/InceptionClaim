"use client";

import { fmtAddr, fmtBal, fmtPct } from "@/lib/format";

export type ClaimApiRecord = {
  status?: string;
  ts?: string;
  wallet?: string;
  amount?: number;
  kyc?: {
    name?: string;
    email?: string;
    address?: string;
    backoffice_id?: string;
  };
};

export type HolderForPanel = {
  r: number;
  a: string;
  b: number;
  p: number;
  n: number;
};

type Props = {
  address: string;
  holder: HolderForPanel | null;
  claim: ClaimApiRecord | undefined;
  kycThreshold: number;
  onClaim: () => void;
  onClose?: () => void;
  holderLoading: boolean;
  claimFlowLoading?: boolean;
};

export function ClaimStatusPanel({
  address,
  holder,
  claim,
  kycThreshold,
  onClaim,
  onClose,
  holderLoading,
  claimFlowLoading = false,
}: Props) {
  const aboveKyc = holder != null && holder.b > kycThreshold;
  const pendingKyc = claim?.status === "pending" && claim.kyc;
  const claimedQuick = claim?.status === "claimed";

  return (
    <aside className="claim-float-panel" id="claim-float-anchor">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div className="claim-float-title" style={{ marginBottom: 0 }}>
          Claim status
        </div>
        {onClose ? (
          <button type="button" className="claim-float-close" onClick={onClose} aria-label="Minimize claim panel">
            ×
          </button>
        ) : null}
      </div>
      <div className="matched-card" style={{ marginBottom: 0 }}>
        <div className="addr">{address}</div>
        {holderLoading ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-muted)" }}>Checking eligibility…</p>
        ) : !holder ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-muted)" }}>
            This wallet is not in the eligible public snapshot list.
          </p>
        ) : (
          <>
            {claim && (
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
            )}

            {pendingKyc ? (
              <div style={{ marginBottom: 14 }}>
                <div className="claim-float-title" style={{ marginBottom: 8 }}>
                  KYC status
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--pending-border)",
                    background: "oklch(0.97 0.04 80 / 0.35)",
                    fontSize: 13,
                    color: "var(--ink-soft)",
                    lineHeight: 1.55,
                  }}
                >
                  <p style={{ margin: 0 }}>
                    Your KYC details were received. The team will review your claim before the Inception 2.0 airdrop is
                    released.
                  </p>
                  <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--gold-deep)" }}>
                    We will contact {claim.kyc?.email || "you"} within 5 business days regarding this claim.
                  </p>
                </div>
              </div>
            ) : null}

            {claimedQuick ? (
              <div style={{ marginBottom: 14 }}>
                <div className="claim-float-title" style={{ marginBottom: 8 }}>
                  Quick claim
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                  Your claim is registered. {fmtBal(holder.b)} wINC will be airdropped to {fmtAddr(holder.a)} when the
                  next claim batch settles.
                </p>
              </div>
            ) : null}

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
                <b>Buy txs</b> {holder.n}
              </span>
            </div>

            {!claim && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--ink-soft)",
                  lineHeight: 1.55,
                  marginTop: 12,
                  marginBottom: 4,
                }}
              >
                {aboveKyc ? (
                  <p style={{ margin: 0 }}>
                    Your balance is above {kycThreshold} wINC, so identity verification is required before the Inception
                    2.0 airdrop is released. Submit your details and we will contact you within 5 business days.
                  </p>
                ) : (
                  <p style={{ margin: 0 }}>
                    Your balance is at or below {kycThreshold} wINC. Confirm to register your claim — the airdrop will
                    be sent to this same address.
                  </p>
                )}
              </div>
            )}

            <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
              {claim ? (
                <button type="button" className="claim-btn" disabled>
                  {claim.status === "pending" ? "Pending verification" : "Claimed"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn primary"
                  onClick={onClaim}
                  disabled={claimFlowLoading}
                >
                  {claimFlowLoading
                    ? "Processing…"
                    : aboveKyc
                      ? "Continue to KYC →"
                      : "Confirm claim"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
