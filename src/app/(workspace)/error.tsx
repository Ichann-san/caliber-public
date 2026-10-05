"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";

/** Unexpected render failure inside the workspace. Adapter errors are shown inline by each view. */
export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorState
      title="This page failed to render"
      body={`${error.message || "Unexpected error."} Try again, or switch persona and reload.`}
      retry={reset}
    />
  );
}
