"use client";

function IconWalletCard() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="6" width="20" height="14" rx="3" />
      <path d="M16 12h.01" />
      <path d="M2 10h20" />
    </svg>
  );
}

type Props = {
  onConnectClick: () => void;
  isConnected: boolean;
};

export function HeroSection({ onConnectClick, isConnected }: Props) {
  return (
    <section className="hero glass">
      <div className="hero-eyebrow">
        <span className="pill">RECOVERY PORTAL</span>
        <span className="hero-chain-meta">
          BSC · wINC contract{" "}
          <code
            style={{
              color: "var(--ink-soft)",
              fontFamily: '"Geist Mono", ui-monospace, monospace',
              fontSize: 11,
            }}
          >
            0xb04e…466c
          </code>
        </span>
      </div>
      <h1>
        Reclaim your <em>Inception</em>
      </h1>
      <p className="lede">
        A snapshot of every wallet holding <b>WrappedInception (wINC)</b> on BNB Smart Chain at the block immediately
        preceding the exploit was used as the basis for the <b>Inception 2.0</b> reissuance. If your wallet appears in
        the list below, you are eligible to claim the equivalent balance in the new token. Connect your wallet, find
        your address, complete claim — balances over 100 wINC are subject to identity verification.
      </p>
      <div className="hero-cta">
        <button type="button" id="cta-connect" className="btn primary" onClick={onConnectClick}>
          <IconWalletCard />
          {isConnected ? "Check status" : "Connect wallet to claim"}
        </button>
        <span>
          <a href="#holders" className="btn ghost ">
            Browse the list
          </a>
        </span>
      </div>
    </section>
  );
}
