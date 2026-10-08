"use client";

import { useEffect, useState } from "react";
import config from "@/lib/config";

/**
 * Renders a small read-only panel of the current runtime config ("feature
 * flags") when the page is loaded with `?debug=1` -- lets a reviewer or
 * support engineer confirm which network/flags a given session is running
 * against without needing server access or a build with extra logging.
 *
 * Reads `window.location.search` directly (rather than
 * `next/navigation`'s `useSearchParams`) so this has no Suspense-boundary
 * requirement and can be dropped into the root layout as-is.
 */
export function FeatureFlagsDebugOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  if (!visible) return null;

  return (
    <div
      data-testid="feature-flags-debug-overlay"
      role="status"
      style={{
        position: "fixed",
        bottom: 8,
        right: 8,
        zIndex: 9999,
        padding: "8px 12px",
        borderRadius: 8,
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        fontSize: 12,
        fontFamily: "monospace",
      }}
    >
      <div>
        <strong>stellarNetwork</strong>: {config.stellarNetwork}
      </div>
      <div>
        <strong>sorobanRpcUrl</strong>: {config.sorobanRpcUrl}
      </div>
      <div>
        <strong>sentryEnabled</strong>: {String(Boolean(config.sentryDsn))}
      </div>
    </div>
  );
}
