"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError } from "@contracts/v1";
import { isApiError, type Result } from "@/lib/client/dataSource";

export type LoadState<T> =
  | { status: "loading"; data: T | null; error: null }
  | { status: "ok"; data: T; error: null }
  | { status: "error"; data: T | null; error: ApiError };

/**
 * Loads a Result<T> whenever `key` changes. Keeps the previous data while
 * reloading so controls do not jump. `setData` replaces data after a mutation.
 */
export function useResult<T>(load: () => Promise<Result<T>>, key: string) {
  const [state, setState] = useState<LoadState<T>>({ status: "loading", data: null, error: null });
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ status: "loading", data: prev.data, error: null }));
    loadRef
      .current()
      .then((res) => {
        if (cancelled) return;
        if (isApiError(res)) setState((prev) => ({ status: "error", data: prev.data, error: res }));
        else setState({ status: "ok", data: res.data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState((prev) => ({
          status: "error",
          data: prev.data,
          error: { error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Unexpected error." } },
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((data: T) => setState({ status: "ok", data, error: null }), []);

  return { state, reload, setData };
}
