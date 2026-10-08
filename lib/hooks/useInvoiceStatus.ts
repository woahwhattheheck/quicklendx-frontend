"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";
import { parseInvoiceStatusResponse } from "@/lib/invoiceStatus";
import type { InvoiceStatus } from "@/lib/qlx";

export interface UseInvoiceStatusResult {
  status: InvoiceStatus | null;
  loading: boolean;
  error: string | null;
}

const TERMINAL: readonly InvoiceStatus[] = ["repaid", "defaulted"];

/** Poll the typed invoice status endpoint, one request at a time.
 * - No overlapping requests (the timer is scheduled only after settlement).
 * - Aborts old requests on invoice-id changes or unmount.
 * - Stops polling after a terminal status.
 * - Keeps the last known status visible through temporary failures.
 */
export function useInvoiceStatus(
  invoiceId: string,
  intervalMs = 5000
): UseInvoiceStatusResult {
  const [result, setResult] = useState<UseInvoiceStatusResult>({
    status: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const id = invoiceId.trim();
    if (!id) {
      setResult({ status: null, loading: false, error: "invoice ID is required" });
      return;
    }

    let cancelled = false;
    let inFlight: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const delayMs = Number.isFinite(intervalMs) ? Math.max(1000, intervalMs) : 5000;

    setResult({ status: null, loading: true, error: null });

    const schedule = () => {
      if (!cancelled) timer = setTimeout(() => void poll(), delayMs);
    };

    const poll = async () => {
      const controller = new AbortController();
      inFlight = controller;
      try {
        const json = await fetchJson<unknown>(
          `/api/invoice/${encodeURIComponent(id)}/status`,
          "invoice status",
          { signal: controller.signal, cache: "no-store" }
        );
        const next = parseInvoiceStatusResponse(json, id);
        if (cancelled) return;
        setResult({ status: next.status, loading: false, error: null });
        if (!TERMINAL.includes(next.status)) schedule();
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "failed to poll invoice status";
        setResult((previous) => ({ ...previous, loading: false, error: message }));
        schedule();
      } finally {
        if (inFlight === controller) inFlight = null;
      }
    };

    void poll();
    return () => {
      cancelled = true;
      inFlight?.abort();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [invoiceId, intervalMs]);

  return result;
}
