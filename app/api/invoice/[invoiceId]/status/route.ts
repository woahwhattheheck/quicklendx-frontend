import { NextResponse } from "next/server";
import { getInvoiceStatus } from "@/lib/qlx";
import type { InvoiceStatusResponse } from "@/lib/invoiceStatus";

/** GET /api/invoice/:invoiceId/status (early-stage demo backend).
 * Production deployments must authenticate and authorize invoice ownership
 * before replacing the mock qlx lookup with real on-chain/provider data. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  if (!invoiceId?.trim() || invoiceId.length > 128) {
    return NextResponse.json({ error: "INVALID_INVOICE_ID" }, { status: 400 });
  }

  const status = await getInvoiceStatus(invoiceId);
  if (status === null) {
    return NextResponse.json({ error: "INVOICE_NOT_FOUND" }, { status: 404 });
  }

  const response: InvoiceStatusResponse = { invoiceId, status };
  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
