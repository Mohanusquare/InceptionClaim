"use client";

import { useScrimLock } from "@/hooks/useScrimLock";

function IconClose() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function IconSearchX() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx={11} cy={11} r={7} />
      <path d="m20 20-3.5-3.5" />
      <path d="m14 8-6 6" />
      <path d="m8 8 6 6" />
    </svg>
  );
}

type Props = {
  open: boolean;
  fullAddress: string;
  snapshotBlockLabel: string;
  onClose: () => void;
};

export function NotFoundModal({ open, fullAddress, snapshotBlockLabel, onClose }: Props) {
  useScrimLock(open, onClose);

  if (!open) return null;

  return (
    <div
      className={`scrim${open ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notfound-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="panel center" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="close-x" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div
          className="success-mark"
          style={{
            background: "var(--warn-bg)",
            color: "var(--warn-ink)",
            borderColor: "var(--warn-border)",
          }}
        >
          <IconSearchX />
        </div>
        <h3 id="notfound-title">No matching wallet found</h3>
        <p style={{ marginTop: 10 }}>
          The wallet you connected does not appear in the eligible holders list. Make sure you connected the same
          wallet that held wINC at block {snapshotBlockLabel}.
        </p>
        <p
          style={{
            fontFamily: '"Geist Mono", ui-monospace, monospace',
            fontSize: 12,
            color: "var(--ink-faint)",
            marginTop: 14,
            wordBreak: "break-all",
          }}
        >
          {fullAddress}
        </p>
      </div>
    </div>
  );
}
