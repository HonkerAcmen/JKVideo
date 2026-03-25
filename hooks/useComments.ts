import { useState, useCallback, useRef, useEffect } from 'react';
import { getComments } from '../services/bilibili';
import type { Comment } from '../services/types';

export function useComments(aid: number, sort: number) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const sortRef = useRef(sort);
  const aidRef = useRef(aid);
  const cursorRef = useRef(''); // empty = first page

  aidRef.current = aid;

  useEffect(() => {
    if (sortRef.current === sort) return;
    sortRef.current = sort;
    cursorRef.current = '';
    hasMoreRef.current = true;
    setComments([]);
    setHasMore(true);
  }, [sort]);

  const load = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current || !aidRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const isFirstPage = cursorRef.current === '';
      const { replies, nextCursor, isEnd } = await getComments(aidRef.current, cursorRef.current, sortRef.current);
      cursorRef.current = nextCursor;
      setComments(prev => isFirstPage ? replies : [...prev, ...replies]);
      if (isEnd || replies.length === 0) {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    if (!aidRef.current) return;
    cursorRef.current = '';
    hasMoreRef.current = true;
    setHasMore(true);
    setComments([]);
    await load();
  }, [load]);

  return { comments, loading, hasMore, load, reload };
}
