"use client";

import { useWallet } from "@/hooks/useWallet";
import { fmtAddr, fmtBal } from "@/lib/format";
import { pushToast } from "@/lib/toast";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ClaimApiRecord, HolderForPanel } from "./ClaimStatusPanel";
import { ClaimStatusPanel } from "./ClaimStatusPanel";
import { HeroSection } from "./HeroSection";
import { HolderExplorer } from "./HolderExplorer";
import { HowItWorks } from "./HowItWorks";
import { KycModal } from "./KycModal";
import { MatchedModal } from "./MatchedModal";
import { MismatchModal } from "./MismatchModal";
import { NotFoundModal } from "./NotFoundModal";
import { SuccessModal } from "./SuccessModal";

type ApiHolder = HolderForPanel & {
  tx: { h: string; t: string; f: string; v: number; b: string }[];
};

type ClaimsMap = Record<string, ClaimApiRecord>;

type Meta = {
  kyc_threshold: number;
  total_eligible: number;
  snapshot_block: number;
  total_txs: number;
  snapshot_time?: string;
};

function resolveIncKycApiPrefix(): string | null {
  const envMode = (process.env.NEXT_PUBLIC_ENVIRONMENT || "live").trim().toLowerCase();
  const selected =
    envMode === "testing"
      ? process.env.NEXT_PUBLIC_API_BASE_URL_TESTING
      : process.env.NEXT_PUBLIC_API_BASE_URL_LIVE;
  if (!selected) return null;
  return selected.trim().replace(/\/+$/, "");
}

export function PortalHome() {
  const { address, isConnected } = useWallet();
  const [claims, setClaims] = useState<ClaimsMap>({});
  const [meta, setMeta] = useState<Meta>({
    kyc_threshold: 100,
    total_eligible: 0,
    snapshot_block: 0,
    total_txs: 0,
  });
  const [holder, setHolder] = useState<ApiHolder | null>(null);
  const [holderLoading, setHolderLoading] = useState(false);
  const [holderResolvedFor, setHolderResolvedFor] = useState<string | null>(null);
  const [kycOpen, setKycOpen] = useState(false);
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [footerGen, setFooterGen] = useState("");
  const [mismatchOpen, setMismatchOpen] = useState(false);
  const [mismatchMsg, setMismatchMsg] = useState("");
  const [notFoundOpen, setNotFoundOpen] = useState(false);
  const [matchedOpen, setMatchedOpen] = useState(false);
  const [claimPanelOpen, setClaimPanelOpen] = useState(true);
  const pendingRowAddrRef = useRef<string | null>(null);
  const lastToastKeyRef = useRef<string>("");
  const lastIneligibleToastFor = useRef<string | null>(null);
  const dismissedNotFoundFor = useRef<string | null>(null);
  const dismissedMatchedFor = useRef<string | null>(null);

  const pushToastDedup = useCallback((message: string, variant: "error" | "info" = "info") => {
    const key = `${variant}:${message}`;
    if (lastToastKeyRef.current === key) return;
    lastToastKeyRef.current = key;
    pushToast(message, variant);
    window.setTimeout(() => {
      if (lastToastKeyRef.current === key) lastToastKeyRef.current = "";
    }, 1800);
  }, []);

  const refreshClaims = useCallback(async () => {
    try {
      const r = await fetch("/api/claims", { cache: "no-store" });
      if (!r.ok) return;
      const data = (await r.json()) as ClaimsMap;
      setClaims(data || {});
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshClaims();
    const id = window.setInterval(() => void refreshClaims(), 10_000);
    return () => window.clearInterval(id);
  }, [refreshClaims]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/snapshot-meta", { cache: "no-store" });
        if (!r.ok) return;
        const m = (await r.json()) as Meta;
        setMeta(m);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    setFooterGen(new Date().toUTCString().replace("GMT", "UTC"));
  }, []);

  useEffect(() => {
    dismissedNotFoundFor.current = null;
    dismissedMatchedFor.current = null;
    setClaimPanelOpen(true);
  }, [address]);

  useEffect(() => {
    const onClaimRow = (ev: WindowEventMap["inception:claim-row"]) => {
      const addr = (ev.detail?.address || "").toLowerCase();
      if (!addr) return;
      const connected = address?.toLowerCase();
      if (connected === addr) {
        setClaimPanelOpen(true);
        document.getElementById("claim-float-anchor")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
      if (connected && connected !== addr) {
        setMismatchMsg(
          `You're connected as ${fmtAddr(connected)} but trying to claim ${fmtAddr(addr)}. Please switch wallets and try again.`,
        );
        setMismatchOpen(true);
        pushToastDedup("Different wallet connected — see details.", "error");
        return;
      }
      pendingRowAddrRef.current = addr;
      window.dispatchEvent(new Event("inception:open-wallet"));
    };
    window.addEventListener("inception:claim-row", onClaimRow);
    return () => window.removeEventListener("inception:claim-row", onClaimRow);
  }, [address, pushToastDedup]);

  useEffect(() => {
    const onShowConnectedState = () => {
      if (!address || holderLoading || holderResolvedFor !== address) return;
      dismissedNotFoundFor.current = null;
      dismissedMatchedFor.current = null;
      if (holder) {
        setNotFoundOpen(false);
        setMatchedOpen(true);
      } else {
        setMatchedOpen(false);
        setNotFoundOpen(false);
        if (lastIneligibleToastFor.current !== address) {
          pushToastDedup("Connected wallet is not in the eligible snapshot list.", "info");
          lastIneligibleToastFor.current = address;
        }
      }
    };
    window.addEventListener("inception:show-connected-state", onShowConnectedState);
    return () => window.removeEventListener("inception:show-connected-state", onShowConnectedState);
  }, [address, holder, holderLoading, holderResolvedFor, pushToastDedup]);

  useEffect(() => {
    const pending = pendingRowAddrRef.current;
    if (!address || !pending) return;
    if (address === pending) {
      pendingRowAddrRef.current = null;
      setClaimPanelOpen(true);
      document.getElementById("claim-float-anchor")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    setMismatchMsg(
      `You connected ${fmtAddr(address)} but tried to claim ${fmtAddr(pending)}. Please connect the wallet that owns ${fmtAddr(pending)}.`,
    );
    setMismatchOpen(true);
    pushToastDedup("Different wallet connected — see details.", "error");
    pendingRowAddrRef.current = null;
  }, [address, pushToastDedup]);

  useEffect(() => {
    if (!address) {
      setHolder(null);
      setHolderResolvedFor(null);
      return;
    }
    let cancelled = false;
    setHolderResolvedFor(null);
    setHolderLoading(true);
    void (async () => {
      try {
        const r = await fetch(`/api/holder?address=${encodeURIComponent(address)}`, {
          cache: "no-store",
        });
        const data = (await r.json()) as { eligible: boolean; holder?: ApiHolder };
        if (!cancelled) {
          setHolder(data.eligible && data.holder ? data.holder : null);
        }
      } catch {
        if (!cancelled) setHolder(null);
      } finally {
        if (!cancelled) {
          setHolderLoading(false);
          setHolderResolvedFor(address);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  /** Mirrors static `onConnected` → `scrim-notfound` / `showMatched` after holder fetch. */
  useEffect(() => {
    if (!address) {
      setNotFoundOpen(false);
      setMatchedOpen(false);
      lastIneligibleToastFor.current = null;
      return;
    }
    if (holderLoading || holderResolvedFor !== address) {
      setNotFoundOpen(false);
      setMatchedOpen(false);
      return;
    }

    if (!holder) {
      setMatchedOpen(false);
      setNotFoundOpen(false);
      if (lastIneligibleToastFor.current !== address) {
        pushToastDedup("Connected wallet is not in the eligible snapshot list.", "info");
        lastIneligibleToastFor.current = address;
      }
    } else {
      setNotFoundOpen(false);
      setMatchedOpen(dismissedMatchedFor.current !== address);
    }
  }, [address, holder, holderLoading, holderResolvedFor, pushToastDedup]);

  const claimForWallet = address ? claims[address.toLowerCase()] : undefined;

  /** README claim flow: ≤ threshold = one-click POST from panel; > threshold = KYC modal. */
  const openClaimFlow = () => {
    if (!holder) return;
    setPostError(null);
    if (holder.b > meta.kyc_threshold) {
      setKycOpen(true);
    } else {
      void submitQuickClaim();
    }
  };

  const closeMismatch = useCallback(() => setMismatchOpen(false), []);

  const closeNotFound = useCallback(() => {
    if (address) dismissedNotFoundFor.current = address;
    setNotFoundOpen(false);
  }, [address]);

  const closeMatched = useCallback(() => {
    if (address) dismissedMatchedFor.current = address;
    setMatchedOpen(false);
  }, [address]);

  const closeKycModal = useCallback(() => {
    setKycOpen(false);
    setPostError(null);
  }, []);

  const closeSuccess = useCallback(() => setSuccess(null), []);

  const postClaim = useCallback(async (body: Record<string, unknown>) => {
    setPostLoading(true);
    setPostError(null);
    try {
      const r = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        const msg = payload.error || `Request failed (${r.status})`;
        setPostError(msg);
        pushToast(msg, "error");
        return false;
      }
      await refreshClaims();
      return true;
    } catch {
      const msg = "Network error — try again.";
      setPostError(msg);
      pushToast(msg, "error");
      return false;
    } finally {
      setPostLoading(false);
    }
  }, [refreshClaims]);

  const submitQuickClaim = useCallback(async (): Promise<boolean> => {
    if (!holder || !address) return false;
    const record: Record<string, unknown> & { wallet: string } = {
      wallet: holder.a,
      amount: holder.b,
      rank: holder.r,
      tx_count: holder.n,
      status: "claimed",
      ts: new Date().toISOString(),
    };
    const ok = await postClaim(record);
    if (ok) {
      setSuccess({
        title: "Claim registered",
        message: `${fmtBal(holder.b)} wINC will be airdropped to ${fmtAddr(holder.a)} when the next claim batch settles. You can close this window.`,
      });
    }
    return ok;
  }, [holder, address, postClaim]);

  const handleMatchedProceed = useCallback(async () => {
    if (!holder || !address) return;
    if (holder.b > meta.kyc_threshold) {
      setKycOpen(true);
      dismissedMatchedFor.current = address;
      setMatchedOpen(false);
      return;
    }
    const ok = await submitQuickClaim();
    if (ok) {
      dismissedMatchedFor.current = address;
      setMatchedOpen(false);
    }
  }, [holder, address, meta.kyc_threshold, submitQuickClaim]);

  const submitKyc = useCallback(
    async (kyc: { name: string; email: string; address: string; backoffice_id: string }) => {
      if (!holder || !address) return;
      const apiPrefix = resolveIncKycApiPrefix();
      if (!apiPrefix) {
        const msg = "INC KYC API base URL is not configured.";
        setPostError(msg);
        pushToast(msg, "error");
        return;
      }
      setPostLoading(true);
      setPostError(null);
      let ok = false;
      try {
        const r = await fetch(`${apiPrefix}/inc-kyc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: kyc.name,
            email: kyc.email,
            walletAddress: holder.a,
            backofficeId: kyc.backoffice_id || "",
          }),
        });
        const payload = (await r.json().catch(() => ({}))) as { error?: string; id?: string };
        if (!r.ok) {
          const msg = payload.error || `Request failed (${r.status})`;
          setPostError(msg);
          pushToast(msg, "error");
          return;
        }
        ok = true;
      } catch {
        const msg = "Network error — try again.";
        setPostError(msg);
        pushToast(msg, "error");
        return;
      } finally {
        setPostLoading(false);
      }
      if (!ok) return;
      setKycOpen(false);
      setSuccess({
        title: "Submitted for verification",
        message: `Thank you. We will contact ${kyc.email} within 5 business days regarding your claim of ${fmtBal(holder.b)} wINC.`,
      });
    },
    [holder, address],
  );

  const blockLabel =
    meta.snapshot_block > 0 ? meta.snapshot_block.toLocaleString("en-US") : "94,759,854";

  const claimFlowLoading = postLoading;

  return (
    <>
      <main>
        <HeroSection
          isConnected={Boolean(address)}
          onConnectClick={() => {
            if (address) {
              setClaimPanelOpen(true);
              document.getElementById("claim-float-anchor")?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
            } else {
              window.dispatchEvent(new Event("inception:open-wallet"));
            }
          }}
        />
        <section className="stats">
          <div className="stat glass">
            <span className="num">{meta.total_eligible.toLocaleString()}</span>
            <span className="lbl">Eligible holders</span>
            <span className="sub">Excluding 10 company wallets</span>
          </div>
          <div className="stat glass">
            <span className="num">{Object.keys(claims).length.toLocaleString()}</span>
            <span className="lbl">Claims received</span>
            <span className="sub">Persists in this browser</span>
          </div>
          <div className="stat glass">
            <span className="num">{meta.total_txs.toLocaleString()}</span>
            <span className="lbl">Buy transactions tracked</span>
            <span className="sub">Across all eligible wallets</span>
          </div>
        </section>
        <HowItWorks
          snapshotBlock={meta.snapshot_block}
          snapshotTime={meta.snapshot_time}
          totalEligible={meta.total_eligible}
          kycThreshold={meta.kyc_threshold}
        />
        <HolderExplorer
          kycThreshold={meta.kyc_threshold}
          claims={claims}
          totalEligible={meta.total_eligible}
        />
        <p className="footer">
          Source · BSC chain · contract{" "}
          <a
            href="https://bscscan.com/token/0xb04eb6b127a5588234fa6fd14df16ff00a7d466c"
            target="_blank"
            rel="noopener noreferrer"
          >
            0xb04e…466c
          </a>{" "}
          · snapshot at block {blockLabel}
          {footerGen ? ` · generated ${footerGen}` : ""}
        </p>
        <p className="legal-disclaimer">
          This portal is provided as-is for eligible snapshot participants only. It does not constitute financial,
          legal, or tax advice. Connecting a wallet signs transactions only when you explicitly confirm them in your
          wallet software.
        </p>
      </main>

      {isConnected && address && claimPanelOpen && (
        <ClaimStatusPanel
          address={address}
          holder={holder}
          claim={claimForWallet}
          kycThreshold={meta.kyc_threshold}
          onClaim={openClaimFlow}
          onClose={() => setClaimPanelOpen(false)}
          holderLoading={holderLoading}
          claimFlowLoading={claimFlowLoading}
        />
      )}

      {isConnected && address && !claimPanelOpen ? (
        <button
          type="button"
          className="claim-float-bubble"
          onClick={() => setClaimPanelOpen(true)}
          aria-label="Open claim status panel"
          title="Open claim status"
        >
          Claim
        </button>
      ) : null}

      {holder && address && (
        <KycModal
          open={kycOpen}
          onClose={closeKycModal}
          balance={holder.b}
          address={holder.a}
          kycThreshold={meta.kyc_threshold}
          reviewSubtitle={`Balance over ${meta.kyc_threshold} wINC requires identity verification. Reviewing claim of ${fmtBal(holder.b)} wINC · address ${fmtAddr(holder.a)}.`}
          onSubmit={submitKyc}
          loading={postLoading}
          error={postError}
        />
      )}

      {address && (
        <NotFoundModal
          open={notFoundOpen}
          fullAddress={address}
          snapshotBlockLabel={blockLabel}
          onClose={closeNotFound}
        />
      )}

      {holder && address && (
        <MatchedModal
          open={matchedOpen}
          holder={holder}
          claim={claimForWallet}
          kycThreshold={meta.kyc_threshold}
          onClose={closeMatched}
          onProceed={handleMatchedProceed}
        />
      )}

      <SuccessModal
        open={Boolean(success)}
        title={success?.title ?? ""}
        message={success?.message ?? ""}
        onClose={closeSuccess}
      />

      <MismatchModal open={mismatchOpen} message={mismatchMsg} onClose={closeMismatch} />
    </>
  );
}
