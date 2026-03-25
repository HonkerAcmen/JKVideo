import React, { useCallback, useEffect, useRef, useState } from "react";
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

export default function FollowingScreen() {
  const router = useRouter();
  const { uid, isLoggedIn } = useAuthStore();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>我的关注</Text>
        <View style={styles.spacer} />
      </View>

      {!isLoggedIn ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>请先登录后查看关注列表</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.mid)}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Image
                source={{ uri: proxyImageUrl(item.face) }}
                style={styles.avatar}
              />
              <View style={styles.info}>
                <Text style={styles.name}>{item.uname}</Text>
                <Text style={styles.sign} numberOfLines={2}>
                  {item.sign || "这个人很懒，什么都没写"}
                </Text>
              </View>
            </View>
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
