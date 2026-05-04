"use client";

import type { DetectedWallet } from "@/hooks/useWallet";
import { useScrimLock } from "@/hooks/useScrimLock";

type Props = {
  open: boolean;
  onClose: () => void;
  detectWallets: () => DetectedWallet[];
  onPick: (w: DetectedWallet) => Promise<void>;
};

function IconClose() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

const codeStyle: React.CSSProperties = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  background: "oklch(1 0 0 / 0.5)",
  padding: "1px 6px",
  borderRadius: 4,
};

function FileProtocolWarning() {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        border: "1px solid var(--gold-faint)",
        background: "oklch(0.96 0.05 80 / 0.45)",
        borderRadius: 14,
        textAlign: "left",
        fontSize: 12.5,
        color: "var(--ink-soft)",
        lineHeight: 1.55,
      }}
    >
      <b style={{ color: "var(--gold-deep)", fontWeight: 500 }}>You&apos;re opening this page from a local file.</b>
      <span>
        {" "}
        Most wallet extensions (MetaMask, Brave, etc.) do not inject into{" "}
        <code style={codeStyle}>file://</code> pages by default. Two options:
      </span>
      <ol style={{ margin: "10px 0 0 0", paddingLeft: 18 }}>
        <li style={{ marginBottom: 6 }}>
          Run a tiny local server: in this folder run <code style={codeStyle}>python3 -m http.server 8000</code> then
          visit <code style={codeStyle}>http://localhost:8000/holders.html</code>
        </li>
        <li>
          Or in Chrome / Brave open <code style={codeStyle}>chrome://extensions</code>, find your wallet, click{" "}
          <b>Details</b>, and toggle <b>&quot;Allow access to file URLs&quot;</b>, then reload this page.
        </li>
      </ol>
    </div>
  );
}

function EmptyWalletList() {
  const isFile = typeof window !== "undefined" && window.location.protocol === "file:";

  return (
    <div
      style={{
        textAlign: "center",
        padding: "18px 12px 10px",
        color: "var(--ink-muted)",
        fontSize: 13,
        lineHeight: 1.55,
      }}
    >
      No injected wallet detected.
      <br />
      Install <b>MetaMask</b>, <b>Brave Wallet</b>, <b>Trust</b>, <b>Phantom</b>, or another EVM wallet to continue.
      {isFile ? <FileProtocolWarning /> : null}
    </div>
  );
}

export function WalletModal({ open, onClose, detectWallets, onPick }: Props) {
  useScrimLock(open, onClose);
  if (!open) return null;

  const wallets = detectWallets();

  return (
    <div
      className={`scrim${open ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-title"
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h3 id="wallet-title">Connect a wallet</h3>
            <p>Choose the wallet that held your wINC at the snapshot.</p>
          </div>
          <button type="button" className="close-x" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div className="wallets">
          {wallets.length === 0 ? (
            <EmptyWalletList />
          ) : (
            wallets.map((w) => (
              <button
                key={w.id}
                type="button"
                className="wallet-opt"
                onClick={() => void onPick(w)}
              >
                {w.icon ? (
                  <span className="wallet-icon">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={w.icon}
                      alt=""
                      width={36}
                      height={36}
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }}
                    />
                  </span>
                ) : (
                  <span className="wallet-icon" />
                )}
                <div style={{ minWidth: 0 }}>
                  <b>{w.name}</b>
                  <span>Detected · injected provider</span>
                </div>
                <span className="opt-status">Connect →</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
