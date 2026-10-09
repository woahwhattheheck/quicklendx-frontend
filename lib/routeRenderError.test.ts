import { afterEach, describe, expect, it, vi } from "vitest";
import { reportRouteRenderError, safeRouteForTelemetry } from "./routeRenderError";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("safe route rendering telemetry", () => {
  it("logs the route template and error type with no private URL or exception text", () => {
    const record = vi.spyOn(console, "error").mockImplementation(() => undefined);
    reportRouteRenderError(
      new TypeError("Bearer private-token-here"),
      "/dashboard/customer-invoice-123/confirm?access_token=private-token-here"
    );

    expect(record).toHaveBeenCalledTimes(1);
    const line = String(record.mock.calls[0]?.[0]);
    const entry = JSON.parse(line) as Record<string, unknown>;
    expect(entry).toMatchObject({
      level: "error",
      event: "route_render_failed",
      route: "/dashboard/[invoiceId]/confirm",
      errorType: "TypeError",
    });
    expect(line).not.toContain("private-token-here");
    expect(line).not.toContain("customer-invoice-123");
  });

  it("fails closed for an unknown route or custom error type", () => {
    const record = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const custom = new Error("private");
    custom.name = "Bearer-secret";
    reportRouteRenderError(custom, "/unknown/secret-id?token=private");

    const line = String(record.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toMatchObject({
      level: "error",
      event: "route_render_failed",
      route: "/[unknown-route]",
      errorType: "Error",
    });
    expect(line).not.toContain("secret");
    expect(safeRouteForTelemetry("/dashboard/id?code=secret")).toBe("/dashboard/[invoiceId]");
  });
});
