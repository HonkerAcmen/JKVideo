import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoCard } from "../../components/VideoCard";
import { getFavoriteFolderVideos } from "../../services/bilibili";
import type { VideoItem } from "../../services/types";

export default function FavoriteDetailScreen() {
  const router = useRouter();
  const { mediaId, title } = useLocalSearchParams<{
    mediaId: string;
    title?: string;
  }>();
  const folderId = Number(mediaId || 0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const handleBack = () => {
    if ((router as any).canGoBack?.()) router.back();
    else router.replace("/favorites" as any);
  };

  const load = useCallback(
    async (reset = false) => {
      if (!folderId || loading) return;
      setLoading(true);
      const nextPage = reset ? 1 : page;
      try {
        const { videos: list, hasMore: more } = await getFavoriteFolderVideos(
          folderId,
          nextPage,
          20,
        );
        setVideos((prev) => (reset ? list : [...prev, ...list]));
        setHasMore(more);
        setPage(nextPage + 1);
      } finally {
        setLoading(false);
      }
    },
    [folderId, loading, page],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setPage(1);
      await load(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setVideos([]);
    setPage(1);
    setHasMore(true);
  }, [folderId]);

  useEffect(() => {
    if (folderId > 0 && videos.length === 0) {
      load(true);
    }
  }, [folderId, videos.length, load]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {title || "收藏夹视频"}
        </Text>
        <View style={styles.spacer} />
      </View>

      <FlatList
        data={videos}
        numColumns={2}
        keyExtractor={(item) => item.bvid}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => (
          <VideoCard
            item={item}
            onPress={() => router.push(`/video/${item.bvid}` as any)}
          />
        )}
        onEndReached={() => {
          if (!loading && hasMore) load();
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color="#00AEEC" />
          ) : !hasMore && videos.length > 0 ? (
            <Text style={styles.endText}>已加载全部视频</Text>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>收藏夹暂无视频</Text>
            </View>
          ) : null
        }
      />
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
  listContent: { paddingTop: 8, paddingBottom: 24 },
  row: { justifyContent: "space-between", paddingHorizontal: 4 },
  loader: { marginVertical: 12 },
  endText: {
    textAlign: "center",
    color: "#999",
    paddingVertical: 14,
    fontSize: 12,
  },
  emptyBox: { paddingTop: 36, alignItems: "center" },
  emptyText: { color: "#888", fontSize: 14 },
});

