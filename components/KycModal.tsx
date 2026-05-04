"use client";

import { useScrimLock } from "@/hooks/useScrimLock";
import { fmtAddr, fmtBal } from "@/lib/format";
import { useEffect, useState } from "react";

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
  onClose: () => void;
  balance: number;
  address: string;
  /** Matches static `kyc-sub` when opening from proceed claim */
  reviewSubtitle?: string;
  kycThreshold: number;
  onSubmit: (kyc: {
    name: string;
    email: string;
    address: string;
    backoffice_id: string;
  }) => Promise<void>;
  loading: boolean;
  error: string | null;
};

export function KycModal({
  open,
  onClose,
  balance,
  address,
  reviewSubtitle,
  kycThreshold,
  onSubmit,
  loading,
  error,
}: Props) {
  useScrimLock(open, onClose);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [postal, setPostal] = useState("");
  const [backofficeId, setBackofficeId] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPostal("");
      setBackofficeId("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit({
      name,
      email,
      address: postal,
      backoffice_id: backofficeId,
    });
  };

  const defaultSub = `Balance over ${kycThreshold} wINC requires identity verification before the airdrop is released.`;
  const sub = reviewSubtitle ?? defaultSub;

  return (
    <div
      className={`scrim${open ? " open" : ""}`}
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="panel panel-large"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kyc-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <div>
            <h3 id="kyc-title">Verify your identity</h3>
            <p id="kyc-sub" style={{ margin: 0 }}>
              {sub}
            </p>
          </div>
          <button type="button" className="close-x" onClick={onClose} disabled={loading} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label htmlFor="kyc-name">Full legal name</label>
            <input id="kyc-name" name="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="kyc-email">Email</label>
            <input
              id="kyc-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="kyc-address">Postal address</label>
            <textarea
              id="kyc-address"
              name="address"
              required
              value={postal}
              onChange={(e) => setPostal(e.target.value)}
              autoComplete="street-address"
            />
          </div>
          <div className="field">
            <label htmlFor="kyc-bo">
              Backoffice ID <span className="opt">(optional)</span>
            </label>
            <input id="kyc-bo" name="backoffice_id" type="text" value={backofficeId} onChange={(e) => setBackofficeId(e.target.value)} autoComplete="off" />
          </div>
          {error && (
            <p
              style={{
                margin: 0,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--warn-border)",
                background: "var(--warn-bg)",
                color: "var(--warn-ink)",
                fontSize: 13,
              }}
            >
              {error}
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? "Processing…" : "Submit for verification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
