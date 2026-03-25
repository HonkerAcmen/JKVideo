import React, { useEffect, useState, useCallback } from "react";
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
import { getFavoriteFolders } from "../services/bilibili";
import type { FavoriteFolder } from "../services/types";
import { proxyImageUrl } from "../utils/imageUrl";

export default function FavoritesScreen() {
  const router = useRouter();
  const { uid, isLoggedIn } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);

  const handleBack = () => {
    if ((router as any).canGoBack?.()) router.back();
    else router.replace("/" as any);
  };

  const loadFolders = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const list = await getFavoriteFolders(Number(uid));
      setFolders(list);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>我的收藏夹</Text>
        <View style={styles.spacer} />
      </View>

      {!isLoggedIn ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>请先登录后查看收藏夹</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator style={styles.loader} color="#00AEEC" />
      ) : (
        <FlatList
          data={folders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() =>
                router.push(
                  {
                    pathname: "/favorites/[mediaId]",
                    params: {
                      mediaId: String(item.id),
                      title: item.title,
                    },
                  } as any,
                )
              }
            >
              <Image
                source={{ uri: proxyImageUrl(item.cover) }}
                style={styles.cover}
              />
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.meta}>{item.media_count} 个视频</Text>
                {!!item.intro && (
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.intro}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>暂无收藏夹</Text>
            </View>
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
  loader: { marginTop: 24 },
  listContent: { paddingVertical: 8 },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cover: {
    width: 92,
    height: 58,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  info: { flex: 1 },
  title: { fontSize: 14, color: "#212121", fontWeight: "600" },
  meta: { fontSize: 12, color: "#777", marginTop: 4 },
  desc: { fontSize: 12, color: "#999", marginTop: 4, lineHeight: 17 },
  centerBox: { padding: 28, alignItems: "center" },
  emptyText: { color: "#888", fontSize: 14 },
});

