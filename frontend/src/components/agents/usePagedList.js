"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/utils/api";

/**
 * A list read page by page ("Muat lebih banyak"): { items, loading, loadingMore, error, hasMore, loadMore, reload }.
 * A change of `query` starts again from the first page; `reload()` refetches the first page.
 * @param {string} path
 * @param {{ query?: object, pageSize?: number, enabled?: boolean }} [options]
 */
export function usePagedList(path, { query, pageSize = 30, enabled = true } = {}) {
  const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);
  const key = `${path}?${queryKey}`;
  const [state, setState] = useState({ key: null, items: [], hasMore: false, error: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    api
      .get(path, { query: { ...JSON.parse(queryKey), limit: pageSize, offset: 0 }, signal: controller.signal })
      .then((res) => setState({ key, items: res.data, hasMore: res.data.length === pageSize, error: null }))
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ key, items: [], hasMore: false, error });
      });
    return () => controller.abort();
  }, [path, queryKey, key, pageSize, enabled, nonce]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await api.get(path, { query: { ...JSON.parse(queryKey), limit: pageSize, offset: state.items.length } });
      setState((prev) => (prev.key === key ? { ...prev, items: [...prev.items, ...res.data], hasMore: res.data.length === pageSize } : prev));
    } catch (error) {
      setState((prev) => (prev.key === key ? { ...prev, error } : prev));
    } finally {
      setLoadingMore(false);
    }
  }, [path, queryKey, key, pageSize, state.items.length]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const current = state.key === key;
  return { items: current ? state.items : [], loading: enabled && !current, loadingMore, error: current ? state.error : null, hasMore: current && state.hasMore, loadMore, reload };
}
