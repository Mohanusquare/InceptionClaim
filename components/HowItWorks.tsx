"use client";

import { useState } from "react";

type Props = {
  snapshotBlock: number;
  snapshotTime?: string;
  totalEligible?: number;
  kycThreshold?: number;
};

function IconClose() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <circle cx={12} cy={12} r={10} />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function HowItWorks({ snapshotBlock, snapshotTime, totalEligible, kycThreshold }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const blockLabel =
    snapshotBlock > 0 ? snapshotBlock.toLocaleString("en-US") : "94,759,854";
  const kyc = kycThreshold ?? 100;
  const holdersLabel =
    totalEligible && totalEligible > 0 ? totalEligible.toLocaleString("en-US") : "—";

  return (
    <>
      <section className="howto glass">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <h2 style={{ marginBottom: 0 }}>How the claim works</h2>
          <button
            type="button"
            className="btn ghost"
            style={{ flexShrink: 0, fontSize: 12, padding: "8px 12px" }}
            onClick={() => setInfoOpen(true)}
            title="Snapshot metadata used by this portal"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <IconHelp />
              Snapshot info
            </span>
          </button>
        </div>
        <p className="intro">
          Eligibility is determined entirely by the on-chain snapshot — there is no signup, no allowlist. The same
          private key that held your original wINC must sign the claim.
        </p>
        <div className="steps">
          <div className="step">
            <span className="num">1</span>
            <h3>Connect your wallet</h3>
            <p>
              Use the same wallet that held wINC at block {blockLabel} — MetaMask, Brave, Trust, or any injected EVM
              wallet.
            </p>
          </div>
          <div className="step">
            <span className="num">2</span>
            <h3>Find your address</h3>
            <p>
              If your address is in the snapshot, a claim panel appears with your balance and your full buy-transaction
              history.
            </p>
          </div>
          <div className="step">
            <span className="num">3</span>
            <h3>KYC if &gt; {kyc} wINC</h3>
            <p>
              Balances above {kyc} wINC require a brief identity check. Submit name, email, and address — no documents
              needed up-front.
            </p>
          </div>
          <div className="step">
            <span className="num">4</span>
            <h3>Receive Inception 2.0</h3>
            <p>
              Claims at or below {kyc} wINC are processed on a rolling basis. Verified larger balances are airdropped
              after KYC review by the team.
            </p>
          </div>
        </div>
      </section>

      <div
        className={`scrim${infoOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="snap-info-title"
        aria-hidden={!infoOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) setInfoOpen(false);
        }}
      >
        <div className="panel" onClick={(e) => e.stopPropagation()}>
          <div className="panel-head">
            <div>
              <h3 id="snap-info-title">Snapshot metadata</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--ink-muted)" }}>
                Public values used to build the eligible-holder list and this portal.
              </p>
            </div>
            <button type="button" className="close-x" onClick={() => setInfoOpen(false)} aria-label="Close">
              <IconClose />
            </button>
          </div>
          <dl
            style={{
              margin: 0,
              display: "grid",
              gap: 12,
              fontSize: 14,
              color: "var(--ink-soft)",
            }}
          >
            <div>
              <dt style={{ fontFamily: '"Geist Mono", monospace', fontSize: 10, color: "var(--ink-faint)" }}>
                Snapshot block
              </dt>
              <dd style={{ margin: "4px 0 0" }}>{blockLabel}</dd>
            </div>
            {snapshotTime ? (
              <div>
                <dt style={{ fontFamily: '"Geist Mono", monospace', fontSize: 10, color: "var(--ink-faint)" }}>
                  Reference time (exploit boundary)
                </dt>
                <dd style={{ margin: "4px 0 0" }}>{snapshotTime}</dd>
              </div>
            ) : null}
            <div>
              <dt style={{ fontFamily: '"Geist Mono", monospace', fontSize: 10, color: "var(--ink-faint)" }}>
                Eligible wallets (after exclusions)
              </dt>
              <dd style={{ margin: "4px 0 0" }}>{holdersLabel}</dd>
            </div>
            <div>
              <dt style={{ fontFamily: '"Geist Mono", monospace', fontSize: 10, color: "var(--ink-faint)" }}>
                KYC threshold
              </dt>
              <dd style={{ margin: "4px 0 0" }}>{kyc} wINC</dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}
