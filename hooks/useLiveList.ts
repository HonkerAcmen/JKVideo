import { useState, useCallback, useRef } from 'react';
import { getLiveList } from '../services/bilibili';
import type { LiveRoom } from '../services/types';

export function useLiveList() {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadingRef = useRef(false);
  const pendingRef = useRef(false);
  const pageRef = useRef(1);
  const areaIdRef = useRef(0);

  const load = useCallback(async (reset = false, parentAreaId?: number) => {
    if (loadingRef.current) {
      if (!reset) pendingRef.current = true;
      return;
    }
    loadingRef.current = true;
    pendingRef.current = false;

    if (parentAreaId !== undefined) {
      areaIdRef.current = parentAreaId;
    }

    if (reset) {
      pageRef.current = 1;
      setRooms([]);
    }

    const page = pageRef.current;
    setLoading(true);
    try {
      const data = await getLiveList(page, areaIdRef.current);
      setRooms(prev => reset ? data : [...prev, ...data]);
      pageRef.current = page + 1;
    } catch (e) {
      console.error('Failed to load live rooms', e);
    } finally {
      loadingRef.current = false;
      setRefreshing(false);

      if (pendingRef.current) {
        pendingRef.current = false;
        load();
      } else {
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback((parentAreaId?: number) => {
    setRefreshing(true);
    load(true, parentAreaId);
  }, [load]);

  return { rooms, loading, refreshing, load, refresh };
}
