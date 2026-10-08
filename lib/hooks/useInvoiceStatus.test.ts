import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useInvoiceStatus } from "./useInvoiceStatus";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useInvoiceStatus", () => {
  it("loads a typed status and stops polling when repaid", async () => {
    const fetchSpy = vi.fn(async () => new Response(
      JSON.stringify({ invoiceId: "inv_1001", status: "repaid" }),
      { status: 200 }
    ));
    vi.stubGlobal("fetch", fetchSpy);

    const { result, unmount } = renderHook(() => useInvoiceStatus("inv_1001"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBe("repaid");
    expect(result.current.error).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("/api/invoice/inv_1001/status");
    unmount();
  });

  it("surfaces a server failure without fabricating a status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("upstream error", { status: 503 })));

    const { result, unmount } = renderHook(() => useInvoiceStatus("inv_1001"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBeNull();
    expect(result.current.error).toBe("invoice status request failed with status 503");
    unmount();
  });

  it("rejects a response for a different invoice", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ invoiceId: "inv_other", status: "funded" }),
      { status: 200 }
    )));
    const { result, unmount } = renderHook(() => useInvoiceStatus("inv_1001"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBeNull();
    expect(result.current.error).toBe("invoice status response had mismatched invoice id");
    unmount();
  });
});
