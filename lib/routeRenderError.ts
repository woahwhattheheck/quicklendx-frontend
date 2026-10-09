import { log } from "./logger";

/**
 * Do not put arbitrary path params into telemetry: invoice IDs and any other
 * user-provided dynamic segments could expose account or payment identifiers.
 */
export function safeRouteForTelemetry(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (/^\/dashboard\/[^/]+\/confirm$/.test(path)) {
    return "/dashboard/[invoiceId]/confirm";
  }
  if (/^\/dashboard\/[^/]+$/.test(path)) {
    return "/dashboard/[invoiceId]";
  }
  if (["/", "/dashboard", "/portfolio", "/settings"].includes(path)) {
    return path;
  }
  return "/[unknown-route]";
}

/** Central structured error event; intentionally excludes messages/stacks. */
export function reportRouteRenderError(error: Error, pathname: string): void {
  const knownErrorTypes = ["Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError"];
  log("error", "route_render_failed", {
    route: safeRouteForTelemetry(pathname),
    errorType: knownErrorTypes.includes(error.name) ? error.name : "Error",
  });
}
