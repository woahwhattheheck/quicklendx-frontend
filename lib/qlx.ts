/**
 * The single client boundary for on-chain reads. Every place in this app
 * that needs invoice/portfolio data goes through here instead of importing
 * `soroban-sdk` directly, so the RPC/contract wiring has one place to land
 * once the escrow contract's read-only methods are available.
 */

import config from "./config";

/** Soroban RPC endpoint resolved through `lib/config.ts` (`SOROBAN_RPC_URL`
 * env var, per-network default). The real RPC client lands here once the
 * escrow contract's read-only methods are deployed -- see the module
 * docblock above; until then this constant keeps the wiring seam visible
 * and env-driven instead of a hardcoded literal. */
export const SOROBAN_RPC_URL = config.sorobanRpcUrl;

export type InvoiceStatus = "open" | "funded" | "repaid" | "defaulted";

export interface Invoice {
  id: string;
  supplier: string;
  /** On-chain i128 stroops amount. Never convert to `number`. */
  amountStroops: bigint;
  status: InvoiceStatus;
  dueAt: string;
}

// TODO(qlx): replace with a real contract read once the escrow contract's
// invoice-listing method is deployed. Seeded here so the UI has something
// real to render against during early development.
const MOCK_INVOICES: readonly Invoice[] = [
  {
    id: "inv_1001",
    supplier: "Acme Textiles",
    amountStroops: 125_000_0000000n,
    status: "open",
    dueAt: "2026-08-15",
  },
  {
    id: "inv_1002",
    supplier: "Blue Ridge Foods",
    amountStroops: 42_500_0000000n,
    status: "funded",
    dueAt: "2026-08-02",
  },
  {
    id: "inv_1003",
    supplier: "Cedar Point Logistics",
    amountStroops: 18_750_0000000n,
    status: "open",
    dueAt: "2026-08-20",
  },
  {
    id: "inv_1004",
    supplier: "Delta Grain Co",
    amountStroops: 9_000_0000000n,
    status: "repaid",
    dueAt: "2026-07-10",
  },
];

/** Fetches every invoice owned by `userId`. Resolves to `[]` for a user with
 * no invoices -- callers must render an explicit empty state for that case
 * rather than leaving a blank screen. */
export async function getInvoicesForUser(userId: string): Promise<Invoice[]> {
  if (!userId) return [];
  return [...MOCK_INVOICES];
}

export interface InvoicePage {
  invoices: Invoice[];
  /** Opaque cursor for the next page, or `null` once there are no more
   * invoices to fetch. Feed it back in as `cursor` to get the next page. */
  nextCursor: string | null;
}

const DEFAULT_PAGE_SIZE = 10;

/** Cursor-paginated read for `useInvoiceList`. `cursor` is an opaque
 * invoice id -- omit it (or pass `null`) for the first page. */
export async function getInvoicePage(
  userId: string,
  { cursor = null, limit = DEFAULT_PAGE_SIZE }: { cursor?: string | null; limit?: number } = {}
): Promise<InvoicePage> {
  const all = await getInvoicesForUser(userId);
  const startIndex = cursor ? all.findIndex((invoice) => invoice.id === cursor) + 1 : 0;
  const page = all.slice(startIndex, startIndex + limit);
  const reachedEnd = startIndex + page.length >= all.length;

  return { invoices: page, nextCursor: reachedEnd ? null : page[page.length - 1].id };
}

export interface InvoiceDetail {
  id: string;
  riskScore: number;
  fundedAmountStroops: bigint;
}

const MOCK_DETAILS: Readonly<Record<string, InvoiceDetail>> = {
  inv_1001: { id: "inv_1001", riskScore: 18, fundedAmountStroops: 0n },
  inv_1002: { id: "inv_1002", riskScore: 42, fundedAmountStroops: 42_500_0000000n },
};

function detailFor(id: string): InvoiceDetail {
  return MOCK_DETAILS[id] ?? { id, riskScore: 50, fundedAmountStroops: 0n };
}

/** Stands in for one simulated RPC round trip's latency, so batching vs.
 * per-item lookups has a real, measurable timing difference in tests
 * instead of both finishing instantly regardless of call shape. */
const SIMULATED_RPC_LATENCY_MS = 20;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Looks up risk/funding detail for a single invoice. Prefer
 * {@link getInvoiceDetailsBatch} when you need more than one -- each call
 * here is its own simulated RPC round trip. */
export async function getInvoiceDetail(id: string): Promise<InvoiceDetail> {
  await delay(SIMULATED_RPC_LATENCY_MS);
  return detailFor(id);
}

/** Looks up risk/funding detail for every id in `ids` in a single simulated
 * RPC round trip, instead of one round trip per id (see #90) -- the portfolio
 * view's invoice count would otherwise make load time scale linearly with
 * portfolio size. */
export async function getInvoiceDetailsBatch(
  ids: readonly string[]
): Promise<Map<string, InvoiceDetail>> {
  if (ids.length === 0) return new Map();
  await delay(SIMULATED_RPC_LATENCY_MS);
  return new Map(ids.map((id) => [id, detailFor(id)]));
}

export type TransactionKind = "funding" | "repayment";

export interface Transaction {
  id: string;
  invoiceId: string;
  kind: TransactionKind;
  /** On-chain i128 stroops amount. Never convert to `number`. */
  amountStroops: bigint;
  occurredAt: string;
}

const MOCK_TRANSACTIONS: readonly Transaction[] = [
  {
    id: "txn_1",
    invoiceId: "inv_1002",
    kind: "funding",
    amountStroops: 42_500_0000000n,
    occurredAt: "2026-07-20T10:00:00.000Z",
  },
  {
    id: "txn_2",
    invoiceId: "inv_1002",
    kind: "repayment",
    amountStroops: 5_000_0000000n,
    occurredAt: "2026-07-25T10:00:00.000Z",
  },
];

/** Fetches every transaction for `invoiceId` through the qlx client
 * boundary -- the `/api/transactions` route calls this directly rather
 * than the route handler re-implementing its own ad-hoc fetch/lookup. */
export async function getTransactionsForInvoice(invoiceId: string): Promise<Transaction[]> {
  if (!invoiceId) return [];
  return MOCK_TRANSACTIONS.filter((txn) => txn.invoiceId === invoiceId);
}
