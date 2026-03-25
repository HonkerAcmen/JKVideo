import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { getFollowings } from "../services/bilibili";
import type { FollowUser } from "../services/types";
import { proxyImageUrl } from "../utils/imageUrl";
import { useFollowingStore } from "../store/followingStore";

type FollowingSort =
  | "recent_watch"
  | "oldest_watch"
  | "oldest_follow"
  | "latest_follow";

const SORT_OPTIONS: { key: FollowingSort; label: string }[] = [
  { key: "recent_watch", label: "最近观看" },
  { key: "oldest_watch", label: "好久未看" },
  { key: "oldest_follow", label: "最早关注" },
  { key: "latest_follow", label: "最新关注" },
];

function fmtDate(ts: number): string {
  if (!ts) return "暂无";
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function FollowingScreen() {
  const router = useRouter();
  const { uid, isLoggedIn } = useAuthStore();
  const { lastViewedByMid, markViewed } = useFollowingStore();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<FollowingSort>("latest_follow");
  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  const handleBack = () => {
    if ((router as any).canGoBack?.()) router.back();
    else router.replace("/" as any);
  };

  const load = useCallback(
    async (reset = false) => {
      if (!uid || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      const nextPage = reset ? 1 : pageRef.current;
      try {
        const { users: list, hasMore: more } = await getFollowings(
          Number(uid),
          nextPage,
          30,
        );
        setUsers((prev) => (reset ? list : [...prev, ...list]));
        setHasMore(more);
        pageRef.current = nextPage + 1;
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [uid],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      pageRef.current = 1;
      await load(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && uid) {
      setUsers([]);
      setHasMore(true);
      pageRef.current = 1;
      load(true);
    } else {
      setUsers([]);
      setHasMore(true);
      pageRef.current = 1;
    }
  }, [isLoggedIn, uid, load]);

  const sortedUsers = useMemo(() => {
    const list = [...users];
    const getWatchTs = (u: FollowUser) => lastViewedByMid[String(u.mid)] ?? 0;
    const getFollowTs = (u: FollowUser) => (u.mtime ?? 0) * 1000;
    list.sort((a, b) => {
      if (sortBy === "recent_watch") {
        const av = getWatchTs(a);
        const bv = getWatchTs(b);
        if (!av && !bv) return (b.mtime ?? 0) - (a.mtime ?? 0);
        if (!av) return 1;
        if (!bv) return -1;
        return bv - av;
      }
      if (sortBy === "oldest_watch") {
        const av = getWatchTs(a);
        const bv = getWatchTs(b);
        if (!av && !bv) return (a.mtime ?? 0) - (b.mtime ?? 0);
        if (!av) return 1;
        if (!bv) return -1;
        return av - bv;
      }
      if (sortBy === "oldest_follow") return getFollowTs(a) - getFollowTs(b);
      return getFollowTs(b) - getFollowTs(a);
    });
    return list;
  }, [lastViewedByMid, sortBy, users]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>我的关注</Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.sortBar}>
        {SORT_OPTIONS.map((opt) => {
          const active = opt.key === sortBy;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortChip, active && styles.sortChipActive]}
              onPress={() => setSortBy(opt.key)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.sortChipText,
                  active && styles.sortChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!isLoggedIn ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>请先登录后查看关注列表</Text>
        </View>
      ) : (
        <FlatList
          data={sortedUsers}
          keyExtractor={(item) => String(item.mid)}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.82}
              onPress={() => {
                void markViewed(item.mid);
                router.push({
                  pathname: "/user/[mid]",
                  params: {
                    mid: String(item.mid),
                    uname: item.uname || "",
                    face: item.face || "",
                    sign: item.sign || "",
                  },
                } as any);
              }}
            >
              <Image
                source={{ uri: proxyImageUrl(item.face) }}
                style={styles.avatar}
              />
              <View style={styles.info}>
                <Text style={styles.name}>{item.uname}</Text>
                <Text style={styles.sign} numberOfLines={2}>
                  {item.sign || "这个人很懒，什么都没写"}
                </Text>
                <Text style={styles.metaLine} numberOfLines={1}>
                  关注: {fmtDate((item.mtime ?? 0) * 1000)} · 最近观看:{" "}
                  {fmtDate(lastViewedByMid[String(item.mid)] ?? 0)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9a9a9a" />
            </TouchableOpacity>
          )}
          onEndReached={() => {
            if (!loadingRef.current && hasMore) load();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loading ? (
              <ActivityIndicator style={styles.loader} color="#00AEEC" />
            ) : !hasMore && users.length > 0 ? (
              <Text style={styles.endText}>已加载全部关注</Text>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.centerBox}>
                <Text style={styles.emptyText}>暂无关注用户</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f4f4" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  backBtn: { padding: 4, width: 32 },
  spacer: { width: 32 },
  topTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
    textAlign: "center",
  },
  listContent: { paddingVertical: 8 },
  sortBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f4f4f4",
  },
  sortChip: {
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7e7e7",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortChipActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  sortChipText: { fontSize: 12, color: "#666", fontWeight: "500" },
  sortChipTextActive: { color: "#fff" },
  row: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#eee",
  },
  info: { flex: 1 },
  name: { fontSize: 14, color: "#222", fontWeight: "600" },
  sign: { fontSize: 12, color: "#888", marginTop: 4, lineHeight: 17 },
  metaLine: { marginTop: 6, fontSize: 11, color: "#999" },
  loader: { marginVertical: 12 },
  endText: {
    textAlign: "center",
    color: "#999",
    paddingVertical: 14,
    fontSize: 12,
  },
  centerBox: { paddingTop: 36, alignItems: "center" },
  emptyText: { color: "#888", fontSize: 14 },
});
