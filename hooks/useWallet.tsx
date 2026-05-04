"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Minimal EIP-1193 surface used by the portal */
export type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
};

export type DetectedWallet = {
  id: string;
  name: string;
  icon?: string;
  provider: Eip1193Provider;
};

type AnnounceDetail = {
  info: {
    uuid?: string;
    name?: string;
    icon?: string;
    rdns?: string;
  };
  provider: Eip1193Provider;
};

type LegacyFlags = {
  isMetaMask?: boolean;
  isBraveWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isRabby?: boolean;
  isOkxWallet?: boolean;
};

type EthMultiProvider = Eip1193Provider &
  LegacyFlags & {
    providers?: (Eip1193Provider & LegacyFlags)[];
  };

type InjectedGlobals = {
  ethereum?: EthMultiProvider;
  phantom?: { ethereum?: Eip1193Provider };
  coinbaseWalletExtension?: Eip1193Provider;
  trustwallet?: Eip1193Provider;
  okxwallet?: Eip1193Provider;
  rabby?: Eip1193Provider;
};

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<AnnounceDetail>;
  }
}

function injectedWindow(): Window & InjectedGlobals {
  return window as unknown as Window & InjectedGlobals;
}

function requestEip6963Announcements() {
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export type WalletContextValue = {
  address: string | null;
  provider: Eip1193Provider | null;
  isConnected: boolean;
  detectWallets: () => DetectedWallet[];
  connectWith: (w: DetectedWallet) => Promise<void>;
  disconnect: () => Promise<void>;
  switchAccountOrWallet: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const FALLBACK_WALLET_CONTEXT: WalletContextValue = {
  address: null,
  provider: null,
  isConnected: false,
  detectWallets: () => [],
  connectWith: async () => {
    throw new Error("Wallet provider is unavailable in this render context.");
  },
  disconnect: async () => {},
  switchAccountOrWallet: async () => {},
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const eip6963Ref = useRef(
    new Map<string, { info: AnnounceDetail["info"]; provider: Eip1193Provider }>(),
  );
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);

  useEffect(() => {
    const onAnnounce = (ev: WindowEventMap["eip6963:announceProvider"]) => {
      const detail = ev.detail;
      if (!detail?.provider) return;
      const info = detail.info || {};
      const key =
        info.uuid || info.rdns || info.name || Math.random().toString(36);
      eip6963Ref.current.set(key, { info, provider: detail.provider });
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    requestEip6963Announcements();
    const t = window.setTimeout(requestEip6963Announcements, 500);
    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      window.clearTimeout(t);
    };
  }, []);

  const onAccountsChanged = useCallback((accounts: unknown) => {
    const list = accounts as string[] | undefined;
    if (!list?.length) {
      setAddress(null);
      setProvider(null);
      return;
    }
    setAddress(list[0]!.toLowerCase());
  }, []);

  const detachListeners = useCallback(
    (p: Eip1193Provider | null) => {
      if (p?.removeListener) {
        try {
          p.removeListener("accountsChanged", onAccountsChanged);
        } catch {
          /* ignore */
        }
      }
    },
    [onAccountsChanged],
  );

  const attachListeners = useCallback(
    (p: Eip1193Provider) => {
      if (typeof p.on === "function") {
        p.on("accountsChanged", onAccountsChanged);
      }
    },
    [onAccountsChanged],
  );

  const detectWallets = useCallback((): DetectedWallet[] => {
    requestEip6963Announcements();
    const seen = new Set<string>();
    const list: DetectedWallet[] = [];

    for (const { info, provider: p } of eip6963Ref.current.values()) {
      const key = (info.rdns || info.uuid || info.name || "wallet").toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({
        id: key,
        name: info.name || "Wallet",
        icon: info.icon,
        provider: p,
      });
    }

    function addLegacy(name: string, p: Eip1193Provider | undefined) {
      if (!p) return;
      if (
        list.some(
          (w) =>
            w.provider === p ||
            w.name.toLowerCase().includes(name.toLowerCase().split(" ")[0]!),
        )
      ) {
        return;
      }
      list.push({ id: name.toLowerCase(), name, provider: p });
    }

    const eth = injectedWindow().ethereum;

    function labelFor(p: LegacyFlags) {
      if (p.isMetaMask) return "MetaMask";
      if (p.isBraveWallet) return "Brave Wallet";
      if (p.isCoinbaseWallet) return "Coinbase Wallet";
      if (p.isTrust) return "Trust Wallet";
      if (p.isRabby) return "Rabby";
      if (p.isOkxWallet) return "OKX Wallet";
      return "Browser wallet";
    }

    if (eth) {
      if (Array.isArray(eth.providers) && eth.providers.length) {
        for (const p of eth.providers) {
          addLegacy(labelFor(p), p);
        }
      } else {
        addLegacy(labelFor(eth), eth);
      }
    }

    const w = injectedWindow();
    addLegacy("Phantom", w.phantom?.ethereum);
    addLegacy("Coinbase Wallet", w.coinbaseWalletExtension);
    addLegacy("Trust Wallet", w.trustwallet);
    addLegacy("OKX Wallet", w.okxwallet);
    addLegacy("Rabby", w.rabby);

    return list;
  }, []);

  const connectWith = useCallback(
    async (w: DetectedWallet) => {
      detachListeners(provider);
      const accts = (await w.provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const addr = (accts[0] || "").toLowerCase();
      if (!addr) throw new Error("no accounts");
      setAddress(addr);
      setProvider(w.provider);
      attachListeners(w.provider);
    },
    [attachListeners, detachListeners, provider],
  );

  const disconnect = useCallback(async () => {
    if (provider) {
      try {
        await provider.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {
        /* older wallets */
      }
      detachListeners(provider);
    }
    setAddress(null);
    setProvider(null);
  }, [detachListeners, provider]);

  const switchAccountOrWallet = useCallback(async () => {
    if (provider) {
      try {
        await provider.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
        const accts = (await provider.request({
          method: "eth_requestAccounts",
        })) as string[];
        if (accts[0]) {
          setAddress(accts[0].toLowerCase());
          return;
        }
      } catch {
        /* fall through */
      }
    }
    await disconnect();
    window.dispatchEvent(new Event("inception:open-wallet"));
  }, [disconnect, provider]);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      provider,
      isConnected: Boolean(address && provider),
      detectWallets,
      connectWith,
      disconnect,
      switchAccountOrWallet,
    }),
    [
      address,
      provider,
      detectWallets,
      connectWith,
      disconnect,
      switchAccountOrWallet,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  return ctx ?? FALLBACK_WALLET_CONTEXT;
}
