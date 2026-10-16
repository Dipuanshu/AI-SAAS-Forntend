import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '../lib/api';
import type { Page } from '../lib/types';

export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Paginated list with "load more". `path(page)` builds the URL; refetches when `deps` change or the screen regains focus. */
export function usePaged<T>(path: (page: number) => string, deps: unknown[]) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const seq = useRef(0);

  const fetchPage = useCallback(
    async (target: number, mode: 'reset' | 'more' | 'pull') => {
      const id = ++seq.current;
      if (mode === 'more') setLoadingMore(true);
      if (mode === 'pull') setRefreshing(true);
      try {
        const r = await get<Page<T>>(path(target));
        if (id !== seq.current) return;
        setItems((prev) => (mode === 'more' ? [...prev, ...r.items] : r.items));
        setTotal(r.total);
        setPage(r.page);
        setTotalPages(r.totalPages);
        setError(null);
      } catch (e) {
        if (id !== seq.current) return;
        setError(e as Error);
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useFocusEffect(
    useCallback(() => {
      void fetchPage(1, 'reset');
    }, [fetchPage]),
  );

  return {
    items,
    total,
    error,
    loading: loading && items.length === 0,
    loadingMore,
    refreshing,
    hasMore: page < totalPages,
    loadMore: () => (page < totalPages && !loadingMore ? fetchPage(page + 1, 'more') : undefined),
    reload: () => fetchPage(1, 'reset'),
    onRefresh: () => fetchPage(1, 'pull'),
  };
}
