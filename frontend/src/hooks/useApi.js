"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/utils/api";
import { useDashboard } from "@/context/DashboardContext";

/**
 * Read data from the API for a screen: { data, error, loading, reload }.
 * `data` keeps the previous answer while a new one loads (a filter change does not blank the list), and `reload()`
 * refetches without showing the loading state. Pass `enabled: false` to wait for something (a selected row).
 * @param {string} path
 * @param {{ query?: object, enabled?: boolean }} [options]
 */
export function useApi(path, { query, enabled = true } = {}) {
  const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);
  const key = `${path}?${queryKey}`;
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    api
      .get(path, { query: JSON.parse(queryKey), signal: controller.signal })
      .then((data) => setResult({ key, data, error: null }))
      .catch((error) => {
        if (error?.name !== "AbortError") setResult({ key, data: null, error });
      });
    return () => controller.abort();
  }, [path, queryKey, key, enabled, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data: result.data, error: result.key === key ? result.error : null, loading: enabled && result.key !== key, reload };
}

/**
 * Run a write: shows the server's message when it fails, an optional success notice when it works.
 * `run(fn, { success })` resolves to { ok, data } and never throws, so a handler stays one line.
 */
export function useAction() {
  const { notify } = useDashboard();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (fn, { success } = {}) => {
      setPending(true);
      try {
        const data = await fn();
        if (success) notify("success", success);
        return { ok: true, data };
      } catch (err) {
        if (err?.status !== 401) notify("error", err?.message || "Terjadi kesalahan.");
        return { ok: false, error: err };
      } finally {
        setPending(false);
      }
    },
    [notify]
  );

  return { run, pending };
}
