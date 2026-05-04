"use client";

import { useWallet } from "@/hooks/useWallet";
import { fmtAddr } from "@/lib/format";
import { formatWalletConnectError, pushToast } from "@/lib/toast";
import { useCallback, useEffect, useRef, useState } from "react";

import { WalletModal } from "./WalletModal";

function IconInfo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconSwitch({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
      <path d="m17 3 4 4-4 4" />
      <path d="M3 7h18" />
      <path d="m7 21-4-4 4-4" />
      <path d="M21 17H3" />
    </svg>
  );
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function Navbar() {
  const { address, isConnected, detectWallets, connectWith, disconnect, switchAccountOrWallet } =
    useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy address");
  const menuRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [menuOpen]);

  useEffect(() => {
    const onOpen = () => setPickerOpen(true);
    window.addEventListener("inception:open-wallet", onOpen);
    return () => window.removeEventListener("inception:open-wallet", onOpen);
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const openPicker = () => setPickerOpen(true);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  return (
    <>
      <nav className="topbar">
        <a href="/" className="brand" style={{ textDecoration: "none" }}>
          <span className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/inception_logo.svg" alt="" width={30} height={30} />
          </span>
          <span>
            Inception <em>2.0</em>
            <br />
            <small>TOKEN RECOVERY</small>
          </span>
        </a>
        <div className="connect-wrap" ref={menuRef}>
          <button
            id="connect"
            type="button"
            className={`connect-btn${isConnected ? " connected" : ""}`}
            onClick={() => {
              if (!address) openPicker();
              else setMenuOpen((o) => !o);
            }}
          >
            <span className="dot" />
            <span className="connect-label">
              {address ? fmtAddr(address) : "Connect wallet"}
            </span>
          </button>
          <div className="wallet-menu" hidden={!menuOpen || !address}>
            <div className="wm-head">
              <div className="wm-label">Connected as</div>
              <div className="wm-addr">{address}</div>
            </div>
            <button
              type="button"
              className="wm-btn"
              onClick={() => {
                setMenuOpen(false);
                window.dispatchEvent(new Event("inception:show-connected-state"));
              }}
            >
              <IconInfo />
              Show wallet details
            </button>
            <button
              type="button"
              className="wm-btn"
              onClick={async () => {
                if (!address) return;
                try {
                  await navigator.clipboard.writeText(address);
                  if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
                  setCopyLabel("Copied");
                  copyTimerRef.current = window.setTimeout(() => {
                    setCopyLabel("Copy address");
                    copyTimerRef.current = null;
                  }, 1100);
                } catch {
                  /* ignore */
                }
              }}
            >
              <IconCopy />
              {copyLabel}
            </button>
            <button
              type="button"
              className="wm-btn"
              onClick={() => {
                setMenuOpen(false);
                void switchAccountOrWallet();
              }}
            >
              <IconSwitch />
              Switch wallet / account
            </button>
            <button
              type="button"
              className="wm-btn wm-danger"
              onClick={() => {
                setMenuOpen(false);
                void disconnect();
              }}
            >
              <IconLogout />
              Disconnect
            </button>
          </div>
        </div>
      </nav>

      <WalletModal
        open={pickerOpen}
        onClose={closePicker}
        detectWallets={detectWallets}
        onPick={async (w) => {
          try {
            await connectWith(w);
            closePicker();
          } catch (err) {
            pushToast(formatWalletConnectError(err), "error");
          }
        }}
      />
    </>
  );
}
