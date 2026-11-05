import { useCallback, useEffect, useSyncExternalStore } from 'react';
import API from '@/api/axios';
import { queryCache } from '@/api/query-cache';

const EMPTY_LIST = [];
export function useApiQuery(url, { enabled = true, staleTime = 30000 } = {}) {
  const subscribe = useCallback((listener) => enabled && url ? queryCache.subscribe(url, listener) : () => {}, [url, enabled]);
  const snapshot = useCallback(() => queryCache.snapshot(url), [url]);
  const state = useSyncExternalStore(subscribe, snapshot);
  const load = useCallback((force = false) => {
    if (enabled && url) return queryCache.load(url, async (signal) => (await API.get(url, { signal })).data, { staleTime, force });
  }, [url, enabled, staleTime]);
  useEffect(() => { load(); }, [load]);
  const refetch = useCallback(() => load(true), [load]);
  if (!enabled || !url) return { data: EMPTY_LIST, error: null, loading: false, refreshing: false, refetch };
  return { ...state, data: state.data ?? EMPTY_LIST, refetch };
}
