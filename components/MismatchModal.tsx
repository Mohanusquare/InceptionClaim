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

type Props = {
  open: boolean;
  title?: string;
  message: string;
  onClose: () => void;
};

export function MismatchModal({ open, title = "Different wallet connected", message, onClose }: Props) {
  useScrimLock(open, onClose);

  if (!open) return null;

  return (
    <div
      className={`scrim${open ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mismatch-title"
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
            background: "var(--pending-bg)",
            color: "var(--pending-ink)",
            borderColor: "var(--pending-border)",
          }}
        >
          <svg
            width={28}
            height={28}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <h3 id="mismatch-title">{title}</h3>
        <p style={{ marginTop: 10 }}>{message}</p>
      </div>
    </div>
  );
}
