import type { Metadata, Viewport } from "next";

import "@/types/inception-events";

import { Navbar } from "@/components/Navbar";
import { ToastHost } from "@/components/ToastHost";
import { WalletProvider } from "@/hooks/useWallet";

import "./globals.css";

export const metadata: Metadata = {
  title: "Inception 2.0 · Token Recovery Portal",
  description: "Reclaim your Inception — eligible wINC holder claim portal.",
};

export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning: extensions (e.g. ColorZilla) inject attrs like cz-shortcut-listen on <body> before hydrate */}
      <body suppressHydrationWarning>
        <WalletProvider>
          <div className="bg" aria-hidden="true" />
          <div className="grain" aria-hidden="true" />
          <Navbar />
          <ToastHost />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
