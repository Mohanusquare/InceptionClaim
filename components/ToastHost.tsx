"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ToastVariant } from "@/lib/toast";

type ToastItem = { id: number; message: string; variant: ToastVariant };

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const recentToastRef = useRef<Map<string, number>>(new Map());

  const push = useCallback((message: string, variant: ToastVariant) => {
    const now = Date.now();
    const key = `${variant}:${message}`;
    const last = recentToastRef.current.get(key) || 0;
    if (now - last < 1800) return;
    recentToastRef.current.set(key, now);
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 5200);
  }, []);

  useEffect(() => {
    const onToast = (ev: WindowEventMap["inception:toast"]) => {
      const { message, variant = "info" } = ev.detail || {};
      if (message) push(message, variant);
    };
    window.addEventListener("inception:toast", onToast);
    return () => window.removeEventListener("inception:toast", onToast);
  }, [push]);

  if (!items.length) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast-item toast-${t.variant}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
