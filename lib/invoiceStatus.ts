import type { InvoiceStatus } from "@/lib/qlx";

export interface InvoiceStatusResponse {
  invoiceId: string;
  status: InvoiceStatus;
}

const ALLOWED_STATUSES: readonly InvoiceStatus[] = [
  "open",
  "funded",
  "repaid",
  "defaulted",
];

/** Validate untrusted JSON at the HTTP boundary instead of trusting a cast. */
export function parseInvoiceStatusResponse(
  value: unknown,
  expectedInvoiceId: string
): InvoiceStatusResponse {
  if (!value || typeof value !== "object") {
    throw new Error("invoice status response was not an object");
  }
  const data = value as Record<string, unknown>;
  if (data.invoiceId !== expectedInvoiceId) {
    throw new Error("invoice status response had mismatched invoice id");
  }
  if (!ALLOWED_STATUSES.some((status) => status === data.status)) {
    throw new Error("invoice status response contained an invalid status");
  }
  return { invoiceId: expectedInvoiceId, status: data.status as InvoiceStatus };
}
