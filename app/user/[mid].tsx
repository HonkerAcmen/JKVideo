import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  ImageBackground,
  useWindowDimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  followUser,
  getRelationStatus,
  getUserSpaceProfile,
  getUserSpaceVideos,
  unfollowUser,
} from "../../services/bilibili";
import type { UserSpaceProfile, VideoItem } from "../../services/types";
import { formatCount, formatDuration } from "../../utils/format";
import { coverImageUrl, proxyImageUrl } from "../../utils/imageUrl";
import { useSettingsStore } from "../../store/settingsStore";
import { useFollowingStore } from "../../store/followingStore";
import { useAuthStore } from "../../store/authStore";
import { LoginModal } from "../../components/LoginModal";
import { AppToast } from "../../components/AppToast";

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
  const { isLoggedIn } = useAuthStore();
  const userMid = Number(mid || 0);
  const [profile, setProfile] = useState<UserSpaceProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "info" });

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
    setProfileLoading(true);
    getUserSpaceProfile(userMid)
      .then(setProfile)
      .catch(() => {
        setProfile(null);
      })
      .finally(() => setProfileLoading(false));
  }, [userMid]);

  useEffect(() => {
    if (!isLoggedIn || !userMid) {
      setFollowing(false);
      return;
    }
    getRelationStatus(userMid)
      .then(setFollowing)
      .catch(() => setFollowing(false));
  }, [isLoggedIn, userMid]);

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

  const displayName = profile?.name || uname || `UID ${mid}`;
  const displayFace = profile?.face || face || "";
  const displaySign = profile?.sign || sign || "这个人很懒，什么都没写";
  const displayTopPhoto = profile?.topPhoto || "";

  const handleToggleFollow = async () => {
    if (!userMid) return;
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    if (followLoading) return;

    if (following) {
      Alert.alert("提示", "确认取消关注该用户？", [
        { text: "取消", style: "cancel" },
        {
          text: "取关",
          style: "destructive",
          onPress: async () => {
            setFollowLoading(true);
            try {
              await unfollowUser(userMid);
              setFollowing(false);
              setToast({ visible: true, message: "已取消关注", type: "success" });
            } catch (e: any) {
              setToast({
                visible: true,
                message: e?.message ?? "请稍后重试",
                type: "error",
              });
            } finally {
              setFollowLoading(false);
            }
          },
        },
      ]);
      return;
    }

    setFollowLoading(true);
    try {
      await followUser(userMid);
      setFollowing(true);
      setToast({ visible: true, message: "关注成功", type: "success" });
    } catch (e: any) {
      setToast({
        visible: true,
        message: e?.message ?? "请稍后重试",
        type: "error",
      });
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {displayName || "UP主页"}
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
            <ImageBackground
              source={
                displayTopPhoto
                  ? { uri: proxyImageUrl(displayTopPhoto) }
                  : undefined
              }
              style={styles.hero}
              imageStyle={styles.heroImage}
            >
              <View style={styles.heroOverlay} />
              <View style={styles.heroContent}>
                {displayFace ? (
                  <Image
                    source={{ uri: proxyImageUrl(displayFace) }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Ionicons name="person" size={26} color="#888" />
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.signText} numberOfLines={2}>
                    {displaySign}
                  </Text>
                  <View style={styles.tagRow}>
                    <View style={styles.infoTag}>
                      <Text style={styles.infoTagText}>
                        Lv.{profile?.level ?? 0}
                      </Text>
                    </View>
                    {!!profile?.vipLabel && (
                      <View style={[styles.infoTag, styles.vipTag]}>
                        <Text style={[styles.infoTagText, styles.vipTagText]}>
                          {profile.vipLabel}
                        </Text>
                      </View>
                    )}
                    {!!profile?.officialTitle && (
                      <View style={[styles.infoTag, styles.officialTag]}>
                        <Text
                          style={[styles.infoTagText, styles.officialTagText]}
                          numberOfLines={1}
                        >
                          {profile.officialTitle}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.heroFollowBtn, following && styles.heroFollowedBtn]}
                  activeOpacity={0.85}
                  onPress={handleToggleFollow}
                  disabled={followLoading}
                >
                  <Text
                    style={[
                      styles.heroFollowText,
                      following && styles.heroFollowedText,
                    ]}
                  >
                    {followLoading ? "处理中..." : following ? "已关注" : "+ 关注"}
                  </Text>
                </TouchableOpacity>
              </View>
              {profileLoading ? (
                <ActivityIndicator style={styles.heroLoader} color="#fff" />
              ) : null}
            </ImageBackground>

            <View style={styles.profileMetaCard}>
              <View style={styles.metaItem}>
                <Text style={styles.metaValue}>
                  {formatCount(profile?.follower ?? 0)}
                </Text>
                <Text style={styles.metaLabel}>粉丝</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaValue}>
                  {formatCount(profile?.following ?? 0)}
                </Text>
                <Text style={styles.metaLabel}>关注</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaValue}>
                  {formatCount(profile?.archiveCount ?? videos.length)}
                </Text>
                <Text style={styles.metaLabel}>投稿</Text>
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
      <LoginModal visible={showLogin} onClose={() => setShowLogin(false)} />
      <AppToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
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
  hero: {
    minHeight: 154,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#d9d9d9",
    marginBottom: 10,
  },
  heroImage: { resizeMode: "cover" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  heroContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  heroLoader: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#ececec",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  avatarFallback: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#efefef",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  profileInfo: { flex: 1 },
  nameText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  signText: { marginTop: 4, fontSize: 12, color: "#ececec", lineHeight: 18 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  infoTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  infoTagText: { fontSize: 11, color: "#fff", fontWeight: "600" },
  vipTag: { backgroundColor: "rgba(255, 177, 177, 0.32)" },
  vipTagText: { color: "#ffe9e9" },
  officialTag: { backgroundColor: "rgba(175, 215, 255, 0.3)", maxWidth: "85%" },
  officialTagText: { color: "#eaf5ff" },
  heroFollowBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  heroFollowedBtn: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  heroFollowText: { color: "#111", fontSize: 12, fontWeight: "700" },
  heroFollowedText: { color: "#fff" },
  profileMetaCard: {
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ececec",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingVertical: 10,
  },
  metaItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  metaValue: { fontSize: 16, color: "#111", fontWeight: "700" },
  metaLabel: { marginTop: 4, fontSize: 11, color: "#888" },
  metaDivider: { width: 1, height: 26, backgroundColor: "#ececec" },
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
