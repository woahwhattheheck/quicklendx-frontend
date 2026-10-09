"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/RouteError";
import { reportRouteRenderError } from "@/lib/routeRenderError";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportRouteRenderError(error, window.location.pathname);
  }, [error]);

  return <RouteError message={error.message} onRetry={reset} />;
}
