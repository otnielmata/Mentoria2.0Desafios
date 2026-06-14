"use client";

import { useEffect } from "react";
import ErrorFallback from "@/components/ui/ErrorFallback";
import { logError } from "@/services/logger.service";

export default function Error({ error, reset }) {
  useEffect(() => {
    logError("render.error", { error });
  }, [error]);

  return <ErrorFallback onRetry={reset} />;
}
