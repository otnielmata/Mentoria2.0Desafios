"use client";

import { useEffect } from "react";
import ErrorFallback from "@/components/ui/ErrorFallback";
import { logError } from "@/services/logger.service";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    logError("render.global_error", { error });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <ErrorFallback onRetry={reset} />
      </body>
    </html>
  );
}
