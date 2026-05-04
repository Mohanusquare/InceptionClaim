"use client";

export type ToastVariant = "error" | "info";

export function pushToast(message: string, variant: ToastVariant = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("inception:toast", { detail: { message, variant } }));
}

export function formatWalletConnectError(err: unknown): string {
  const e = err as { code?: number; message?: string };
  const m = (e?.message || String(err)).trim();
  if (e?.code === 4001 || /user rejected|rejected the request|denied|user denied/i.test(m)) {
    return "User rejected the request.";
  }
  if (/network|fetch failed|failed to fetch|timeout|econnrefused/i.test(m)) {
    return "Network error — try again.";
  }
  return m ? `Connection cancelled or failed: ${m}` : "Connection cancelled or failed.";
}
