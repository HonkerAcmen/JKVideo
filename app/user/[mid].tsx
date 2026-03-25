import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUserSpaceVideos } from "../../services/bilibili";
import type { VideoItem } from "../../services/types";
import { formatCount, formatDuration } from "../../utils/format";
import { coverImageUrl, proxyImageUrl } from "../../utils/imageUrl";
import { useSettingsStore } from "../../store/settingsStore";
import { useFollowingStore } from "../../store/followingStore";

const H_PADDING = 12;
const ITEM_GAP = 10;
type VideoSort = "pubdate" | "click";

export default function UserHomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { mid, uname, face, sign } = useLocalSearchParams<{
    mid: string;
    uname?: string;
    face?: string;
    sign?: string;
  }>();
  const coverQuality = useSettingsStore((s) => s.coverQuality);
  const markViewed = useFollowingStore((s) => s.markViewed);
  const userMid = Number(mid || 0);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [videoSort, setVideoSort] = useState<VideoSort>("pubdate");
  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  const listWidth = Math.max(width - H_PADDING * 2, 320);
  const cardWidth = Math.floor((listWidth - ITEM_GAP) / 2);
  const thumbHeight = Math.floor(cardWidth * 0.5625);

  const handleBack = () => {
    if ((router as any).canGoBack?.()) router.back();
    else router.replace("/following" as any);
  };

  const load = useCallback(
    async (reset = false) => {
      if (!userMid || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      const nextPage = reset ? 1 : pageRef.current;
      try {
        const { videos: list, hasMore: more } = await getUserSpaceVideos(
          userMid,
          nextPage,
          20,
          videoSort,
        );
        setVideos((prev) => (reset ? list : [...prev, ...list]));
        setHasMore(more);
        pageRef.current = nextPage + 1;
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [userMid, videoSort],
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
    setVideos([]);
    setHasMore(true);
    pageRef.current = 1;
    load(true);
  }, [load, userMid, videoSort]);

  useEffect(() => {
    if (!userMid) return;
    markViewed(userMid);
  }, [markViewed, userMid]);

  const renderVideoCard = ({ item }: { item: VideoItem }) => (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      activeOpacity={0.85}
      onPress={() => {
        markViewed(userMid);
        router.push(`/video/${item.bvid}` as any);
      }}
    >
      <View style={styles.thumbWrap}>
        <Image
          source={{ uri: coverImageUrl(item.pic, coverQuality) }}
          style={{ width: cardWidth, height: thumbHeight }}
          resizeMode="cover"
        />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="play" size={12} color="#666" />
          <Text style={styles.metaText}>{formatCount(item.stat?.view ?? 0)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {uname || "UP主页"}
        </Text>
        <View style={styles.spacer} />
      </View>

      <FlatList
        data={videos}
        numColumns={2}
        keyExtractor={(item) => item.bvid}
        renderItem={renderVideoCard}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={() => {
          if (!loadingRef.current && hasMore) load();
        }}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View>
            <View style={styles.profileCard}>
              {face ? (
                <Image source={{ uri: proxyImageUrl(face) }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person" size={26} color="#888" />
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.nameText}>{uname || `UID ${mid}`}</Text>
                <Text style={styles.signText} numberOfLines={2}>
                  {sign || "这个人很懒，什么都没写"}
                </Text>
              </View>
            </View>
            <View style={styles.sortRow}>
              <TouchableOpacity
                style={[
                  styles.sortBtn,
                  videoSort === "pubdate" && styles.sortBtnActive,
                ]}
                onPress={() => setVideoSort("pubdate")}
                activeOpacity={0.86}
              >
                <Text
                  style={[
                    styles.sortBtnText,
                    videoSort === "pubdate" && styles.sortBtnTextActive,
                  ]}
                >
                  按日期
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortBtn,
                  videoSort === "click" && styles.sortBtnActive,
                ]}
                onPress={() => setVideoSort("click")}
                activeOpacity={0.86}
              >
                <Text
                  style={[
                    styles.sortBtnText,
                    videoSort === "click" && styles.sortBtnTextActive,
                  ]}
                >
                  按播放量
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color="#111" />
          ) : !hasMore && videos.length > 0 ? (
            <Text style={styles.endText}>已加载全部视频</Text>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>TA 还没有公开投稿</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f6f6" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ececec",
  },
  backBtn: { padding: 4, width: 32 },
  spacer: { width: 32 },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    color: "#111",
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: H_PADDING,
    paddingTop: 10,
    paddingBottom: 28,
  },
  profileCard: {
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ececec",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#ececec",
  },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#efefef",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  nameText: { fontSize: 16, fontWeight: "700", color: "#111" },
  signText: { marginTop: 4, fontSize: 12, color: "#666", lineHeight: 18 },
  column: { justifyContent: "space-between", marginBottom: ITEM_GAP },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sortBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortBtnActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  sortBtnText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  sortBtnTextActive: { color: "#fff" },
  card: {
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ececec",
    overflow: "hidden",
  },
  thumbWrap: { position: "relative", backgroundColor: "#ddd" },
  durationBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: "rgba(17,17,17,0.88)",
  },
  durationText: { fontSize: 10, color: "#fff", fontWeight: "600" },
  cardBody: { padding: 10, minHeight: 64, justifyContent: "space-between" },
  videoTitle: {
    fontSize: 13,
    color: "#111",
    lineHeight: 18,
    minHeight: 36,
    fontWeight: "500",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  metaText: { fontSize: 11, color: "#666" },
  loader: { marginVertical: 12 },
  endText: {
    textAlign: "center",
    color: "#9a9a9a",
    fontSize: 12,
    paddingVertical: 10,
  },
  emptyBox: { alignItems: "center", paddingVertical: 44 },
  emptyText: { fontSize: 14, color: "#888" },
});
