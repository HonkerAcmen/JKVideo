import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface FollowingStoreState {
  hasLoaded: boolean;
  lastViewedByMid: Record<string, number>;
  restore: () => Promise<void>;
  markViewed: (mid: number) => Promise<void>;
}

const STORAGE_KEY = "following_last_viewed_map";

export const useFollowingStore = create<FollowingStoreState>((set, get) => ({
  hasLoaded: false,
  lastViewedByMid: {},

  restore: async () => {
    if (get().hasLoaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({ hasLoaded: true });
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, number>;
      set({ hasLoaded: true, lastViewedByMid: parsed ?? {} });
    } catch {
      set({ hasLoaded: true, lastViewedByMid: {} });
    }
  },

  markViewed: async (mid) => {
    if (!mid) return;
    const now = Date.now();
    const key = String(mid);
    const next = { ...get().lastViewedByMid, [key]: now };
    set({ lastViewedByMid: next });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  },
}));
