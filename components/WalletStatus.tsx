"use client";

import { useEffect, useRef, useState } from "react";
import { connectWallet } from "@/lib/wallet";

type WalletState =
  | { status: "disconnected" }
  | { status: "connecting" }
  | { status: "connected"; publicKey: string }
  | { status: "error"; message: string };

/** The connection pill and disconnect action read one state. A late wallet
 * approval cannot restore a connection after disconnect or cancellation.
 * Disconnect clears application state, not the Freighter extension grant. */
export function WalletStatus() {
  const [wallet, setWallet] = useState<WalletState>({ status: "disconnected" });
  const generation = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, []);

  const disconnect = () => {
    generation.current++;
    setWallet({ status: "disconnected" });
  };

  const connect = async () => {
    const current = ++generation.current;
    setWallet({ status: "connecting" });
    try {
      const result = await connectWallet();
      if (!mounted.current || generation.current !== current) return;
      if (result.error || !result.publicKey) {
        setWallet({ status: "error", message: result.error ?? "No wallet address was returned" });
      } else {
        setWallet({ status: "connected", publicKey: result.publicKey });
      }
    } catch {
      if (mounted.current && generation.current === current) {
        setWallet({ status: "error", message: "Could not connect to Freighter" });
      }
    }
  };

  const label =
    wallet.status === "connected"
      ? `Connected: ${wallet.publicKey.slice(0, 5)}…${wallet.publicKey.slice(-4)}`
      : wallet.status === "connecting"
        ? "Connecting wallet…"
        : "Wallet disconnected";

  return (
    <section className="wallet-status" aria-label="Wallet connection">
      <span className="wallet-status-pill" data-status={wallet.status} role="status">
        {label}
      </span>
      {wallet.status === "error" && <span role="alert">{wallet.message}</span>}
      {wallet.status === "connected" || wallet.status === "connecting" ? (
        <button type="button" className="btn btn-secondary" onClick={disconnect}>
          {wallet.status === "connecting" ? "Cancel connection" : "Disconnect wallet"}
        </button>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={connect}>
          {wallet.status === "error" ? "Retry wallet connection" : "Connect wallet"}
        </button>
      )}
    </section>
  );
}
