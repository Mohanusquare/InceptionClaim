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

function IconCheck() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

type Props = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export function SuccessModal({ open, title, message, onClose }: Props) {
  useScrimLock(open, onClose);

  return (
    <div
      className={`scrim${open ? " open" : ""}`}
      aria-hidden={!open}
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
        <div className="success-mark">
          <IconCheck />
        </div>
        <h3>{title}</h3>
        <p style={{ marginTop: 10 }}>{message}</p>
        <div className="form-actions" style={{ justifyContent: "center", marginTop: 16 }}>
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
