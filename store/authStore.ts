import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserInfo } from "../services/bilibili";

interface AuthState {
  sessdata: string | null;
  biliJct: string | null;
  uid: string | null;
  username: string | null;
  face: string | null;
  isLoggedIn: boolean;
  login: (
    sessdata: string,
    uid: string,
    username?: string,
    biliJct?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  setProfile: (face: string, username: string, uid: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  sessdata: null,
  biliJct: null,
  uid: null,
  username: null,
  face: null,
  isLoggedIn: false,

  login: async (sessdata, uid, username, biliJct) => {
    const pairs: [string, string][] = [
      ["SESSDATA", sessdata],
      ["UID", uid],
      ["USERNAME", username ?? ""],
    ];
    if (biliJct) pairs.push(["BILI_JCT", biliJct]);
    await AsyncStorage.multiSet(pairs);
    if (!biliJct) await AsyncStorage.removeItem("BILI_JCT");
    set({
      sessdata,
      biliJct: biliJct ?? null,
      uid,
      username: username ?? null,
      isLoggedIn: true,
    });
  },

  logout: async () => {
    await AsyncStorage.multiRemove([
      "SESSDATA",
      "BILI_JCT",
      "UID",
      "USERNAME",
      "FACE",
    ]);
    set({
      sessdata: null,
      biliJct: null,
      uid: null,
      username: null,
      face: null,
      isLoggedIn: false,
    });
  },

  restore: async () => {
    const [sessdata, biliJct] = await AsyncStorage.multiGet([
      "SESSDATA",
      "BILI_JCT",
    ]).then((pairs) => [pairs[0][1], pairs[1][1]]);
    if (sessdata) {
      set({ sessdata, biliJct, isLoggedIn: true });
      try {
        const info = await getUserInfo();
        await AsyncStorage.setItem("FACE", info.face);
        set({ face: info.face, username: info.uname, uid: String(info.mid) });
      } catch {}
    }
  },

  setProfile: (face, username, uid) => set({ face, username, uid }),
}));
