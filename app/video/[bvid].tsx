import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  ScrollView,
  useWindowDimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoPlayer } from "../../components/VideoPlayer";
import { CommentItem } from "../../components/CommentItem";
import { getDanmaku } from "../../services/bilibili";
import { DanmakuItem } from "../../services/types";
import DanmakuList from "../../components/DanmakuList";
import { useVideoDetail } from "../../hooks/useVideoDetail";
import { useComments } from "../../hooks/useComments";
import { useRelatedVideos } from "../../hooks/useRelatedVideos";
import { formatCount, formatDuration } from "../../utils/format";
import { proxyImageUrl } from "../../utils/imageUrl";
import { DownloadSheet } from "../../components/DownloadSheet";

type Tab = "intro" | "comments" | "danmaku";
const DETAIL_LIST_INITIAL_NUM = 6;
const DETAIL_LIST_MAX_BATCH = 6;
const DETAIL_LIST_WINDOW_SIZE = 9;
const DETAIL_LIST_BATCH_INTERVAL = 48;

export default function VideoDetailScreen() {
  const { bvid } = useLocalSearchParams<{ bvid: string }>();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const {
    video,
    playData,
    loading: videoLoading,
    qualities,
    currentQn,
    changeQuality,
  } = useVideoDetail(bvid as string);
  const [commentSort, setCommentSort] = useState<0 | 2>(2);
  const {
    comments,
    loading: cmtLoading,
    hasMore: cmtHasMore,
    load: loadComments,
  } = useComments(video?.aid ?? 0, commentSort);
  const [tab, setTab] = useState<Tab>("intro");
  const [danmakus, setDanmakus] = useState<DanmakuItem[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [showDownload, setShowDownload] = useState(false);
  const isWeb = Platform.OS === "web";
  const isAndroid = Platform.OS === "android";
  const stats = video?.stat;
  const webShellWidth = Math.min(Math.max(width - 32, 320), 1320);
  const isWideWeb = isWeb && webShellWidth >= 980;
  const webColumnGap = isWideWeb ? 24 : 0;
  const webMainWidth = isWideWeb
    ? Math.floor((webShellWidth - webColumnGap) * 0.7)
    : webShellWidth;
  const webSideWidth = isWideWeb
    ? webShellWidth - webMainWidth - webColumnGap
    : webShellWidth;
  const androidAvailableHeight = Math.max(height - 72, 520);
  const androidExpandedRatio = 0.5;
  const androidCollapsedRatio = 0.3;
  const [androidPlayerRatio, setAndroidPlayerRatio] = useState(
    androidExpandedRatio,
  );
  const playerHeightAnim = useRef(
    new Animated.Value(
      Math.max(Math.floor(androidAvailableHeight * androidExpandedRatio), 240),
    ),
  ).current;
  const infoHeightAnim = useRef(
    new Animated.Value(
      Math.max(
        androidAvailableHeight -
          Math.max(Math.floor(androidAvailableHeight * androidExpandedRatio), 240),
        220,
      ),
    ),
  ).current;
  const lastLayoutRatioRef = useRef(androidExpandedRatio);
  const {
    videos: relatedVideos,
    loading: relatedLoading,
    load: loadRelated,
  } = useRelatedVideos();

  useEffect(() => {
    loadRelated();
  }, []);

  useEffect(() => {
    if (video?.aid) loadComments();
  }, [video?.aid, commentSort]);

  useEffect(() => {
    if (!video?.cid) return;
    getDanmaku(video.cid).then(setDanmakus);
  }, [video?.cid]);

  useEffect(() => {
    if (!isAndroid) return;
    setAndroidPlayerRatio(androidExpandedRatio);
    lastLayoutRatioRef.current = androidExpandedRatio;
    const playerHeight = Math.max(
      Math.floor(androidAvailableHeight * androidExpandedRatio),
      240,
    );
    playerHeightAnim.setValue(playerHeight);
    infoHeightAnim.setValue(
      Math.max(androidAvailableHeight - playerHeight, 220),
    );
  }, [
    androidAvailableHeight,
    androidExpandedRatio,
    infoHeightAnim,
    isAndroid,
    playerHeightAnim,
    width,
  ]);

  const handleInfoScroll = (offsetY: number) => {
    if (!isAndroid) return;
    const nextRatio = offsetY > 72 ? androidCollapsedRatio : androidExpandedRatio;
    if (Math.abs(nextRatio - lastLayoutRatioRef.current) < 0.01) {
      return;
    }
    const nextPlayerHeight = Math.max(
      Math.floor(androidAvailableHeight * nextRatio),
      240,
    );
    const nextInfoHeight = Math.max(
      androidAvailableHeight - nextPlayerHeight,
      220,
    );
    setAndroidPlayerRatio(nextRatio);
    lastLayoutRatioRef.current = nextRatio;
    Animated.parallel([
      Animated.spring(playerHeightAnim, {
        toValue: nextPlayerHeight,
        damping: 22,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: false,
      }),
      Animated.spring(infoHeightAnim, {
        toValue: nextInfoHeight,
        damping: 22,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleInfoScrollEvent = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    handleInfoScroll(e.nativeEvent.contentOffset.y);
  };
  const androidPlayerHeight = isAndroid
    ? Math.max(Math.floor(androidAvailableHeight * androidPlayerRatio), 240)
    : undefined;
  const androidInfoHeight = isAndroid
    ? Math.max(androidAvailableHeight - (androidPlayerHeight ?? 0), 220)
    : undefined;

  const handleBack = () => {
    if ((router as any).canGoBack?.()) {
      router.back();
    } else {
      router.replace("/" as any);
    }
  };

  const renderTopBar = () => (
    <View
      style={[
        styles.topBar,
        isWeb ? styles.webTopBar : styles.mobileTopBar,
      ]}
    >
      <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
        <Ionicons
          name="chevron-back"
          size={24}
          color={isWeb ? "#212121" : "#fff"}
        />
      </TouchableOpacity>
      <Text style={[styles.topTitle, !isWeb && styles.mobileTopTitle]} numberOfLines={1}>
        {video?.title ?? "视频详情"}
      </Text>
      <TouchableOpacity
        style={styles.miniBtn}
        onPress={() => setShowDownload(true)}
      >
        <Ionicons
          name="cloud-download-outline"
          size={22}
          color={isWeb ? "#212121" : "#fff"}
        />
      </TouchableOpacity>
    </View>
  );

  const renderTabBar = () =>
    video ? (
      <View style={[styles.tabBar, isWeb && styles.webTabBar]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab("intro")}>
          <Text style={[styles.tabLabel, tab === "intro" && styles.tabActive]}>
            简介
          </Text>
          {tab === "intro" && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setTab("comments")}
        >
          <Text style={[styles.tabLabel, tab === "comments" && styles.tabActive]}>
            评论
            {(stats?.reply ?? 0) > 0 ? ` ${formatCount(stats?.reply ?? 0)}` : ""}
          </Text>
          {tab === "comments" && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab("danmaku")}>
          <Text style={[styles.tabLabel, tab === "danmaku" && styles.tabActive]}>
            弹幕
            {danmakus.length > 0 ? ` ${formatCount(danmakus.length)}` : ""}
          </Text>
          {tab === "danmaku" && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>
    ) : null;

  const renderIntroHeader = () => (
    <>
      <View style={styles.upRow}>
        <Image
          source={{ uri: proxyImageUrl(video?.owner.face ?? "") }}
          style={styles.avatar}
        />
        <Text style={styles.upName}>{video?.owner.name ?? ""}</Text>
        <TouchableOpacity style={styles.followBtn}>
          <Text style={styles.followTxt}>+ 关注</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.titleSection}>
        <Text style={styles.title}>{video?.title}</Text>
        <View style={styles.statsRow}>
          <StatBadge icon="play" count={stats?.view ?? 0} />
          <StatBadge icon="heart" count={stats?.like ?? 0} />
          <StatBadge icon="star" count={stats?.favorite ?? 0} />
          <StatBadge icon="chatbubble" count={stats?.reply ?? 0} />
        </View>
      </View>
      {video?.ugc_season && (
        <SeasonSection
          season={video.ugc_season}
          currentBvid={bvid as string}
          onEpisodePress={(epBvid) => router.replace(`/video/${epBvid}`)}
        />
      )}
      <View style={styles.descBox}>
        <Text style={styles.descText}>{video?.desc || "暂无简介"}</Text>
      </View>
      <View style={styles.relatedHeader}>
        <Text style={styles.relatedHeaderText}>推荐视频</Text>
      </View>
    </>
  );

  const renderRelatedCard = (item: import("../../services/types").VideoItem) => (
    <TouchableOpacity
      key={item.bvid}
      style={[styles.relatedCard, isWeb && styles.webRelatedCard]}
      onPress={() => router.push(`/video/${item.bvid}` as any)}
      activeOpacity={0.85}
    >
      <View style={styles.relatedThumbWrap}>
        <Image
          source={{ uri: proxyImageUrl(item.pic) }}
          style={styles.relatedThumb}
          resizeMode="cover"
        />
        <View style={styles.relatedDuration}>
          <Text style={styles.relatedDurationText}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      </View>
      <View style={styles.relatedInfo}>
        <Text style={styles.relatedTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.relatedMetaRow}>
          <Text style={styles.relatedOwner} numberOfLines={1}>
            {item.owner?.name ?? ""}
          </Text>
          <Text style={styles.relatedView}>
            {formatCount(item.stat?.view ?? 0)} 播放
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderIntroContent = () => {
    if (isWeb) {
      return (
        <ScrollView
          style={styles.webPanelScroll}
          contentContainerStyle={styles.webPanelContent}
          showsVerticalScrollIndicator={false}
        >
          {renderIntroHeader()}
          {relatedVideos.map(renderRelatedCard)}
          {relatedLoading && (
            <ActivityIndicator style={styles.loader} color="#00AEEC" />
          )}
        </ScrollView>
      );
    }
    return (
      <FlatList<import("../../services/types").VideoItem>
        style={styles.tabScroll}
        data={relatedVideos}
        keyExtractor={(item) => item.bvid}
        showsVerticalScrollIndicator={false}
        onScroll={isAndroid ? handleInfoScrollEvent : undefined}
        scrollEventThrottle={16}
        removeClippedSubviews
        initialNumToRender={DETAIL_LIST_INITIAL_NUM}
        maxToRenderPerBatch={DETAIL_LIST_MAX_BATCH}
        windowSize={DETAIL_LIST_WINDOW_SIZE}
        updateCellsBatchingPeriod={DETAIL_LIST_BATCH_INTERVAL}
        onEndReached={() => {
          if (!relatedLoading) loadRelated();
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderIntroHeader()}
        renderItem={({ item }) => renderRelatedCard(item)}
        ListEmptyComponent={
          !relatedLoading ? (
            <ActivityIndicator style={styles.loader} color="#00AEEC" />
          ) : null
        }
        ListFooterComponent={
          relatedLoading ? (
            <ActivityIndicator style={styles.loader} color="#00AEEC" />
          ) : null
        }
      />
    );
  };

  const renderCommentsContent = () => {
    if (isWeb) {
      return (
        <ScrollView
          style={styles.webPanelScroll}
          contentContainerStyle={styles.webPanelContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>排序</Text>
            <TouchableOpacity
              style={[styles.sortBtn, commentSort === 2 && styles.sortBtnActive]}
              onPress={() => setCommentSort(2)}
            >
              <Text
                style={[
                  styles.sortBtnTxt,
                  commentSort === 2 && styles.sortBtnTxtActive,
                ]}
              >
                热门
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortBtn, commentSort === 0 && styles.sortBtnActive]}
              onPress={() => setCommentSort(0)}
            >
              <Text
                style={[
                  styles.sortBtnTxt,
                  commentSort === 0 && styles.sortBtnTxtActive,
                ]}
              >
                最新
              </Text>
            </TouchableOpacity>
          </View>
          {comments.map((item) => (
            <CommentItem key={String(item.rpid)} item={item} />
          ))}
          {cmtLoading ? (
            <ActivityIndicator style={styles.loader} color="#00AEEC" />
          ) : !cmtHasMore && comments.length > 0 ? (
            <Text style={styles.emptyTxt}>已加载全部评论</Text>
          ) : comments.length === 0 ? (
            <Text style={styles.emptyTxt}>暂无评论</Text>
          ) : (
            <TouchableOpacity
              style={styles.webLoadMore}
              onPress={() => loadComments()}
            >
              <Text style={styles.webLoadMoreText}>加载更多评论</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      );
    }
    return (
      <FlatList
        style={styles.tabScroll}
        data={comments}
        keyExtractor={(c) => String(c.rpid)}
        renderItem={({ item }) => <CommentItem item={item} />}
        onEndReached={() => {
          if (cmtHasMore && !cmtLoading) loadComments();
        }}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        onScroll={isAndroid ? handleInfoScrollEvent : undefined}
        scrollEventThrottle={16}
        removeClippedSubviews
        initialNumToRender={DETAIL_LIST_INITIAL_NUM}
        maxToRenderPerBatch={DETAIL_LIST_MAX_BATCH}
        windowSize={DETAIL_LIST_WINDOW_SIZE}
        updateCellsBatchingPeriod={DETAIL_LIST_BATCH_INTERVAL}
        ListHeaderComponent={
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>排序</Text>
            <TouchableOpacity
              style={[styles.sortBtn, commentSort === 2 && styles.sortBtnActive]}
              onPress={() => setCommentSort(2)}
            >
              <Text
                style={[
                  styles.sortBtnTxt,
                  commentSort === 2 && styles.sortBtnTxtActive,
                ]}
              >
                热门
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortBtn, commentSort === 0 && styles.sortBtnActive]}
              onPress={() => setCommentSort(0)}
            >
              <Text
                style={[
                  styles.sortBtnTxt,
                  commentSort === 0 && styles.sortBtnTxtActive,
                ]}
              >
                最新
              </Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          cmtLoading ? (
            <ActivityIndicator style={styles.loader} color="#00AEEC" />
          ) : !cmtHasMore && comments.length > 0 ? (
            <Text style={styles.emptyTxt}>已加载全部评论</Text>
          ) : null
        }
        ListEmptyComponent={!cmtLoading ? <Text style={styles.emptyTxt}>暂无评论</Text> : null}
      />
    );
  };

  const renderDanmakuContent = () => (
    <DanmakuList
      danmakus={danmakus}
      currentTime={currentTime}
      visible={tab === "danmaku"}
      onToggle={() => {}}
      hideHeader={true}
      onExternalScroll={isAndroid ? handleInfoScroll : undefined}
      style={[isWeb ? styles.webDanmakuTab : styles.danmakuTab]}
    />
  );

  if (isWideWeb) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.webDetailShell, { width: webShellWidth }]}>
          {renderTopBar()}
          <View style={styles.webDetailBody}>
            <View style={[styles.webMainCol, { width: webMainWidth }]}>
              <View style={styles.webPlayerCard}>
                <VideoPlayer
                  playData={playData}
                  qualities={qualities}
                  currentQn={currentQn}
                  onQualityChange={changeQuality}
                  webWidth={webMainWidth}
                  bvid={bvid as string}
                  cid={video?.cid}
                  danmakus={danmakus}
                  onTimeUpdate={setCurrentTime}
                />
              </View>
            </View>
            <View style={[styles.webSideCol, { width: webSideWidth }]}>
              <View style={styles.webPanel}>
                {renderTabBar()}
                {videoLoading ? (
                  <ActivityIndicator style={styles.loader} color="#00AEEC" />
                ) : video ? (
                  tab === "intro" ? renderIntroContent() : tab === "comments" ? renderCommentsContent() : renderDanmakuContent()
                ) : null}
              </View>
            </View>
          </View>
        </View>
        <DownloadSheet
          visible={showDownload}
          onClose={() => setShowDownload(false)}
          bvid={bvid as string}
          cid={video?.cid ?? 0}
          title={video?.title ?? ""}
          cover={video?.pic ?? ""}
          qualities={qualities}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {renderTopBar()}

      {/* Video player — fixed 16:9 */}
      <Animated.View
        style={
          isAndroid
            ? { height: playerHeightAnim, overflow: "hidden" }
            : null
        }
      >
        <VideoPlayer
          playData={playData}
          qualities={qualities}
          currentQn={currentQn}
          onQualityChange={changeQuality}
          webWidth={isWeb ? Math.min(Math.max(width - 32, 320), 920) : undefined}
          nativeStyle={isAndroid ? ({ height: "100%" } as any) : undefined}
          bvid={bvid as string}
          cid={video?.cid}
          danmakus={danmakus}
          onTimeUpdate={setCurrentTime}
        />
      </Animated.View>
      <DownloadSheet
        visible={showDownload}
        onClose={() => setShowDownload(false)}
        bvid={bvid as string}
        cid={video?.cid ?? 0}
        title={video?.title ?? ""}
        cover={video?.pic ?? ""}
        qualities={qualities}
      />
      <Animated.View
        style={[
          styles.mobileInfoShell,
          isAndroid ? { height: infoHeightAnim } : null,
        ]}
      >
        {renderTabBar()}

        {videoLoading ? (
          <ActivityIndicator style={styles.loader} color="#00AEEC" />
        ) : video ? (
          <>
            {tab === "intro" && renderIntroContent()}
            {tab === "comments" && renderCommentsContent()}
            {tab === "danmaku" &&
              (isWeb ? (
                renderDanmakuContent()
              ) : (
                <DanmakuList
                  danmakus={danmakus}
                  currentTime={currentTime}
                  visible={tab === "danmaku"}
                  onToggle={() => {}}
                  hideHeader={true}
                  onExternalScroll={isAndroid ? handleInfoScroll : undefined}
                  style={[
                    styles.danmakuTab,
                    tab !== "danmaku" && { display: "none" },
                  ]}
                />
              ))}
          </>
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
}

function StatBadge({ icon, count }: { icon: string; count: number }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon as any} size={14} color="#999" />
      <Text style={styles.statText}>{formatCount(count)}</Text>
    </View>
  );
}

function SeasonSection({
  season,
  currentBvid,
  onEpisodePress,
}: {
  season: NonNullable<import("../../services/types").VideoItem["ugc_season"]>;
  currentBvid: string;
  onEpisodePress: (bvid: string) => void;
}) {
  const episodes = season.sections?.[0]?.episodes ?? [];
  const currentIndex = episodes.findIndex((ep) => ep.bvid === currentBvid);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (currentIndex <= 0 || episodes.length === 0) return;
    // 等布局完成再滚动
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: currentIndex,
        viewPosition: 0.5, // 居中
        animated: false,
      });
    }, 200);
    return () => clearTimeout(t);
  }, [currentIndex, episodes.length]);

  return (
    <View style={styles.seasonBox}>
      <View style={styles.seasonHeader}>
        <Text style={styles.seasonTitle}>合集 · {season.title}</Text>
        <Text style={styles.seasonCount}>{season.ep_count}个视频</Text>
        <Ionicons name="chevron-forward" size={14} color="#999" />
      </View>
      <FlatList
        ref={listRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        data={episodes}
        keyExtractor={(ep) => ep.bvid}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
        // 每个卡片宽 120，gap 10，让 FlatList 直接算任意索引的偏移量
        getItemLayout={(_data, index) => ({
          length: 130,
          offset: 12 + index * 130,
          index,
        })}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item: ep, index }) => {
          const isCurrent = ep.bvid === currentBvid;
          return (
            <TouchableOpacity
              style={[styles.epCard, isCurrent && styles.epCardActive]}
              onPress={() => !isCurrent && onEpisodePress(ep.bvid)}
              activeOpacity={0.8}
            >
              {ep.arc?.pic && (
                <Image
                  source={{ uri: proxyImageUrl(ep.arc.pic) }}
                  style={styles.epThumb}
                />
              )}
              <Text style={[styles.epNum, isCurrent && styles.epNumActive]}>
                第{index + 1}集
              </Text>
              <Text style={styles.epTitle} numberOfLines={2}>
                {ep.title}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0a0a" },
  webDetailShell: {
    flex: 1,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  webDetailBody: {
    flex: 1,
    flexDirection: "row",
    gap: 24,
    alignItems: "flex-start",
  },
  webMainCol: {
    flexShrink: 0,
  },
  webPlayerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e7edf5",
    shadowColor: "#10233d",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  webSideCol: {
    flex: 1,
  },
  webPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e7edf5",
    overflow: "hidden",
    minHeight: 640,
    shadowColor: "#10233d",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  webPanelScroll: {
    flex: 1,
  },
  webPanelContent: {
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  mobileTopBar: {
    backgroundColor: "#0a0a0a",
    borderBottomWidth: 0,
  },
  webTopBar: {
    marginBottom: 16,
    paddingHorizontal: 0,
    paddingTop: 0,
    borderBottomWidth: 0,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  topTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
    color: "#17202a",
  },
  mobileTopTitle: {
    color: "#fff",
  },
  miniBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  mobileInfoShell: {
    flex: 1,
    marginTop: -14,
    backgroundColor: "#f7f7f7",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
  },
  loader: { marginVertical: 30 },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e3e3e3",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
    lineHeight: 30,
    marginBottom: 12,
  },
  statsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#efefef",
  },
  statText: { fontSize: 12, color: "#565656", fontWeight: "500" },
  upRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 0,
    paddingTop: 22,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, marginRight: 12 },
  upName: { flex: 1, fontSize: 15, color: "#111111", fontWeight: "600" },
  followBtn: {
    backgroundColor: "#161616",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  followTxt: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  seasonBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e3e3e3",
    paddingVertical: 14,
  },
  seasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 10,
    gap: 4,
  },
  seasonTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111111" },
  seasonCount: { fontSize: 12, color: "#7a7a7a" },
  epCard: {
    width: 120,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },
  epCardActive: { borderColor: "#1a1a1a", backgroundColor: "#f2f2f2" },
  epThumb: { width: 120, height: 68, backgroundColor: "#eee" },
  epNum: { fontSize: 11, color: "#999", paddingHorizontal: 6, paddingTop: 4 },
  epNumActive: { color: "#111111", fontWeight: "700" },
  epTitle: {
    fontSize: 12,
    color: "#222222",
    paddingHorizontal: 6,
    paddingBottom: 6,
    lineHeight: 16,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
    backgroundColor: "#f7f7f7",
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  webTabBar: {
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabLabel: { fontSize: 13, color: "#777777", fontWeight: "500" },
  tabActive: { color: "#111111", fontWeight: "700" },
  tabUnderline: {
    position: "absolute",
    bottom: 2,
    width: 24,
    height: 3,
    backgroundColor: "#111111",
    borderRadius: 999,
  },
  tabScroll: { flex: 1 },
  descBox: { paddingHorizontal: 20, paddingVertical: 18 },
  descText: { fontSize: 14, color: "#4a4a4a", lineHeight: 24 },
  danmakuTab: { flex: 1 },
  webDanmakuTab: {
    height: 720,
  },
  emptyTxt: { textAlign: "center", color: "#8b8b8b", padding: 30 },
  relatedHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#f1f1f1",
  },
  relatedHeaderText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111111",
  },
  relatedCard: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e6e6e6",
    gap: 12,
  },
  webRelatedCard: {
    paddingHorizontal: 14,
  },
  relatedThumbWrap: {
    position: "relative",
    width: 120,
    height: 68,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#eee",
    flexShrink: 0,
  },
  relatedThumb: { width: 120, height: 68 },
  relatedDuration: {
    position: "absolute",
    bottom: 3,
    right: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  relatedDurationText: { color: "#fff", fontSize: 10 },
  relatedInfo: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  relatedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  relatedTitle: { fontSize: 13, color: "#191919", lineHeight: 19, fontWeight: "500" },
  relatedOwner: { fontSize: 12, color: "#6f6f6f" },
  relatedView: { fontSize: 11, color: "#959595" },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
    backgroundColor: "#f5f5f5",
  },
  sortLabel: { fontSize: 13, color: "#707070", marginRight: 4 },
  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d5d5d5",
    backgroundColor: "#ffffff",
  },
  sortBtnActive: { borderColor: "#1a1a1a", backgroundColor: "#ededed" },
  sortBtnTxt: { fontSize: 12, color: "#666666" },
  sortBtnTxtActive: { color: "#111111", fontWeight: "600" as const },
  webLoadMore: {
    alignSelf: "center",
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#d2d2d2",
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
  },
  webLoadMoreText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "600",
  },
});
