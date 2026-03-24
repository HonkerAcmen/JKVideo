import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Image,
  RefreshControl,
  ViewToken,
  FlatList,
  ScrollView,
  Platform,
  useWindowDimensions,
} from "react-native";
import PagerView from "react-native-pager-view";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoCard } from "../components/VideoCard";
import { LiveCard } from "../components/LiveCard";
import { LoginModal } from "../components/LoginModal";
import { DownloadProgressBtn } from "../components/DownloadProgressBtn";
import { useVideoList } from "../hooks/useVideoList";
import { useLiveList } from "../hooks/useLiveList";
import { useAuthStore } from "../store/authStore";
import {
  toListRows,
  type ListRow,
  type BigRow,
  type LiveRow,
} from "../utils/videoRows";
import { BigVideoCard } from "../components/BigVideoCard";
import { FollowedLiveStrip } from "../components/FollowedLiveStrip";
import type { LiveRoom } from "../services/types";

const HEADER_H = 44;
const TAB_H = 38;
const NAV_H = HEADER_H + TAB_H;
const isWeb = Platform.OS === "web";

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

type TabKey = "hot" | "live";

const TABS: { key: TabKey; label: string }[] = [
  { key: "hot", label: "热门" },
  { key: "live", label: "直播" },
];

const LIVE_AREAS = [
  { id: 0, name: "推荐" },
  { id: 2, name: "网游" },
  { id: 3, name: "手游" },
  { id: 6, name: "单机游戏" },
  { id: 1, name: "娱乐" },
  { id: 9, name: "虚拟主播" },
  { id: 10, name: "生活" },
  { id: 11, name: "知识" },
];

export default function HomeScreen() {
  const router = useRouter();
  const { pages, liveRooms, loading, refreshing, load, refresh } =
    useVideoList();
  const {
    rooms,
    loading: liveLoading,
    refreshing: liveRefreshing,
    load: liveLoad,
    refresh: liveRefresh,
  } = useLiveList();
  const { isLoggedIn, face } = useAuthStore();
  const { width: windowWidth } = useWindowDimensions();
  const [showLogin, setShowLogin] = useState(false);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("hot");
  const [liveAreaId, setLiveAreaId] = useState(0);

  const [visibleBigKey, setVisibleBigKey] = useState<string | null>(null);
  const rows = useMemo(() => toListRows(pages, liveRooms), [pages, liveRooms]);
  const pagerRef = useRef<PagerView>(null);
  const webScrollRef = useRef<ScrollView>(null);
  const webContainerWidth = Math.min(Math.max(windowWidth - 24, 320), 1180);
  const webSingleColumn = isWeb && webContainerWidth < 760;
  const webCardWidth = webSingleColumn
    ? webContainerWidth - 8
    : Math.min((webContainerWidth - 24) / 2, 360);
  const webGridWidth = webSingleColumn ? webCardWidth : webCardWidth * 2 + 12;
  const webBigCardWidth = isWeb
    ? webGridWidth
    : undefined;
  const webNavWidth = webSingleColumn
    ? Math.min(webContainerWidth, 680)
    : webGridWidth;

  const hotListRef = useRef<FlatList>(null);
  const liveListRef = useRef<FlatList>(null);

  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const bigRow = viewableItems.find(
        (v) => v.item && (v.item as ListRow).type === "big",
      );
      setVisibleBigKey(bigRow ? (bigRow.item as BigRow).item.bvid : null);
    },
  ).current;

  const scrollY = useRef(new Animated.Value(0)).current;

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_H],
    outputRange: [0, -HEADER_H],
    extrapolate: "clamp",
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_H * 0.2],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // 直播列表也共用同一个 scrollY
  const liveScrollY = useRef(new Animated.Value(0)).current;

  const liveHeaderTranslate = liveScrollY.interpolate({
    inputRange: [0, HEADER_H],
    outputRange: [0, -HEADER_H],
    extrapolate: "clamp",
  });

  const liveHeaderOpacity = liveScrollY.interpolate({
    inputRange: [0, HEADER_H * 0.2],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  useEffect(() => {
    load();
  }, []);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [],
  );

  const onLiveScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: liveScrollY } } }], {
        useNativeDriver: true,
      }),
    [],
  );

  const handleTabPress = useCallback(
    (key: TabKey) => {
      if (key === activeTab) {
        // 点击已激活的 tab：滚动到顶部并刷新
        if (key === "hot") {
          if (isWeb) {
            webScrollRef.current?.scrollTo({ y: 0, animated: true });
          } else {
            hotListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }
          refresh();
        } else {
          if (isWeb) {
            webScrollRef.current?.scrollTo({ y: 0, animated: true });
          } else {
            liveListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }
          liveRefresh(liveAreaId);
        }
        return;
      }
      // 切换 tab
      setActiveTab(key);
      if (!isWeb) {
        pagerRef.current?.setPage(key === "hot" ? 0 : 1);
      } else {
        webScrollRef.current?.scrollTo({ y: 0, animated: false });
      }
      if (key === "live" && rooms.length === 0) {
        liveLoad(true, liveAreaId);
      }
    },
    [activeTab, rooms.length, liveAreaId],
  );

  const onPageSelected = useCallback(
    (e: any) => {
      const key: TabKey = e.nativeEvent.position === 0 ? "hot" : "live";
      if (key === activeTab) return;
      setActiveTab(key);
      if (key === "live" && rooms.length === 0) {
        liveLoad(true, liveAreaId);
      }
    },
    [activeTab, rooms.length, liveAreaId],
  );

  const handleLiveAreaPress = useCallback(
    (areaId: number) => {
      if (areaId === liveAreaId) return;
      setLiveAreaId(areaId);
      if (isWeb) {
        webScrollRef.current?.scrollTo({ y: 0, animated: false });
      } else {
        liveListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
      liveLoad(true, areaId);
    },
    [liveAreaId, liveLoad],
  );

  const visibleBigKeyRef = useRef(visibleBigKey);
  visibleBigKeyRef.current = visibleBigKey;

  const renderItem = useCallback(
    ({ item: row }: { item: ListRow }) => {
      if (row.type === "big") {
        return (
          <BigVideoCard
            item={row.item}
            isVisible={visibleBigKeyRef.current === row.item.bvid}
            width={webBigCardWidth}
            onPress={() => router.push(`/video/${row.item.bvid}` as any)}
          />
        );
      }
      if (row.type === "live") {
        if (webSingleColumn) {
          return (
            <View style={styles.webStack}>
              <LiveCard
                isLivePulse
                item={row.left}
                width={webCardWidth}
                onPress={() => router.push(`/live/${row.left.roomid}` as any)}
              />
              {row.right && (
                <LiveCard
                  isLivePulse
                  item={row.right}
                  width={webCardWidth}
                  onPress={() =>
                    router.push(`/live/${row.right!.roomid}` as any)
                  }
                />
              )}
            </View>
          );
        }
        return (
          <View style={[styles.row, isWeb && { width: webGridWidth }]}>
            <View style={styles.leftCol}>
              <LiveCard
                isLivePulse
                item={row.left}
                width={isWeb ? webCardWidth : undefined}
                onPress={() => router.push(`/live/${row.left.roomid}` as any)}
              />
            </View>
            {row.right && (
              <View style={styles.rightCol}>
                <LiveCard
                  isLivePulse
                  item={row.right}
                  width={isWeb ? webCardWidth : undefined}
                  onPress={() =>
                    router.push(`/live/${row.right!.roomid}` as any)
                  }
                />
              </View>
            )}
          </View>
        );
      }
      const right = row.right;
      if (webSingleColumn) {
        return (
          <View style={styles.webStack}>
            <VideoCard
              item={row.left}
              width={webCardWidth}
              onPress={() => router.push(`/video/${row.left.bvid}` as any)}
            />
            {right && (
              <VideoCard
                item={right}
                width={webCardWidth}
                onPress={() => router.push(`/video/${right.bvid}` as any)}
              />
            )}
          </View>
        );
      }
      return (
        <View style={[styles.row, isWeb && { width: webGridWidth }]}>
          <View style={styles.leftCol}>
            <VideoCard
              item={row.left}
              width={isWeb ? webCardWidth : undefined}
              onPress={() => router.push(`/video/${row.left.bvid}` as any)}
            />
          </View>
          {right && (
            <View style={styles.rightCol}>
              <VideoCard
                item={right}
                width={isWeb ? webCardWidth : undefined}
                onPress={() => router.push(`/video/${right.bvid}` as any)}
              />
            </View>
          )}
        </View>
      );
    },
    [router, webBigCardWidth, webCardWidth, webGridWidth, webSingleColumn],
  );

  const renderLiveItem = useCallback(
    ({ item }: { item: { left: LiveRoom; right?: LiveRoom } }) => {
      if (webSingleColumn) {
        return (
          <View style={styles.webStack}>
            <LiveCard
              item={item.left}
              width={webCardWidth}
              onPress={() => router.push(`/live/${item.left.roomid}` as any)}
            />
            {item.right && (
              <LiveCard
                item={item.right}
                width={webCardWidth}
                onPress={() => router.push(`/live/${item.right!.roomid}` as any)}
              />
            )}
          </View>
        );
      }
      return (
        <View style={[styles.row, isWeb && { width: webGridWidth }]}>
          <View style={styles.leftCol}>
            <LiveCard
              item={item.left}
              width={isWeb ? webCardWidth : undefined}
              onPress={() => router.push(`/live/${item.left.roomid}` as any)}
            />
          </View>
          {item.right && (
            <View style={styles.rightCol}>
              <LiveCard
                item={item.right}
                width={isWeb ? webCardWidth : undefined}
                onPress={() => router.push(`/live/${item.right!.roomid}` as any)}
              />
            </View>
          )}
        </View>
      );
    },
    [router, webCardWidth, webGridWidth, webSingleColumn],
  );

  // 将直播列表分成两列的行
  const liveRows = useMemo(() => {
    const result: { left: LiveRoom; right?: LiveRoom }[] = [];
    for (let i = 0; i < rooms.length; i += 2) {
      result.push({ left: rooms[i], right: rooms[i + 1] });
    }
    return result;
  }, [rooms]);

  const currentHeaderTranslate =
    activeTab === "hot" ? headerTranslate : liveHeaderTranslate;
  const currentHeaderOpacity =
    activeTab === "hot" ? headerOpacity : liveHeaderOpacity;

  const renderNavBar = () => (
    <>
      <View style={[styles.header, isWeb && styles.webHeader]}>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() =>
              isLoggedIn ? router.push("/settings" as any) : setShowLogin(true)
            }
          >
            {isLoggedIn && face ? (
              <Image source={{ uri: face }} style={styles.userAvatar} />
            ) : (
              <Ionicons
                name={isLoggedIn ? "person" : "person-outline"}
                size={22}
                color="#00AEEC"
              />
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push("/search" as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={14} color="#999" />
          <Text style={styles.searchPlaceholder}>搜索视频、UP主...</Text>
        </TouchableOpacity>
        <DownloadProgressBtn onPress={() => router.push("/downloads" as any)} />
      </View>

      <View style={[styles.tabRow, isWeb && styles.webTabRow]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderHotRows = () => (
    <>
      {rows.map((row, index) => (
        <View
          key={
            row.type === "big"
              ? `big-${row.item.bvid}`
              : row.type === "live"
                ? `live-${index}-${row.left.roomid}-${row.right?.roomid ?? "empty"}`
                : `pair-${row.left.bvid}-${row.right?.bvid ?? "empty"}`
          }
        >
          {renderItem({ item: row })}
        </View>
      ))}
      <View style={styles.footer}>
        {loading ? (
          <ActivityIndicator color="#00AEEC" />
        ) : (
          <TouchableOpacity
            style={styles.webLoadMoreBtn}
            onPress={() => load()}
            activeOpacity={0.8}
          >
            <Text style={styles.webLoadMoreText}>加载更多</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const renderLiveRows = () => (
    <>
      <View>
        <FollowedLiveStrip />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.areaTabRow}
          contentContainerStyle={styles.areaTabContent}
        >
          {LIVE_AREAS.map((area) => (
            <TouchableOpacity
              key={area.id}
              style={[
                styles.areaTab,
                liveAreaId === area.id && styles.areaTabActive,
              ]}
              onPress={() => handleLiveAreaPress(area.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.areaTabText,
                  liveAreaId === area.id && styles.areaTabTextActive,
                ]}
              >
                {area.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {liveRows.map((item, index) => (
        <View
          key={`live-${index}-${item.left.roomid}-${item.right?.roomid ?? "empty"}`}
        >
          {renderLiveItem({ item })}
        </View>
      ))}
      <View style={styles.footer}>
        {liveLoading ? (
          <>
            <ActivityIndicator color="#00AEEC" />
            <Text style={styles.footerText}>加载中...</Text>
          </>
        ) : (
          <TouchableOpacity
            style={styles.webLoadMoreBtn}
            onPress={() => liveLoad()}
            activeOpacity={0.8}
          >
            <Text style={styles.webLoadMoreText}>加载更多直播</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  if (isWeb) {
    return (
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        <View style={styles.webShell}>
          <View style={[styles.webNavBar, { width: webNavWidth }]}>
            {renderNavBar()}
          </View>
          <ScrollView
            ref={webScrollRef}
            style={styles.webScroll}
            contentContainerStyle={styles.webScrollContent}
            showsVerticalScrollIndicator
          >
            <View style={styles.webContent}>
              {activeTab === "hot" ? renderHotRows() : renderLiveRows()}
            </View>
          </ScrollView>
        </View>
        <LoginModal visible={showLogin} onClose={() => setShowLogin(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      {/* 滑动切换容器 */}
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        scrollEnabled={false}
        onPageSelected={onPageSelected}
      >
        {/* 热门列表 */}
        <View key="hot" collapsable={false}>
          <Animated.FlatList
            ref={hotListRef as any}
            style={styles.listContainer}
            data={rows}
            keyExtractor={(row: any, index: number) =>
              row.type === "big"
                ? `big-${row.item.bvid}`
                : row.type === "live"
                  ? `live-${index}-${row.left.roomid}-${row.right?.roomid ?? "empty"}`
                  : `pair-${row.left.bvid}-${row.right?.bvid ?? "empty"}`
            }
            contentContainerStyle={{
              paddingTop: insets.top + NAV_H + 6,
              paddingBottom: insets.bottom + 16,
            }}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                progressViewOffset={insets.top + NAV_H}
              />
            }
            onEndReached={() => load()}
            onEndReachedThreshold={0.5}
            extraData={visibleBigKey}
            viewabilityConfig={VIEWABILITY_CONFIG}
            onViewableItemsChanged={onViewableItemsChangedRef}
            ListFooterComponent={
              <View style={styles.footer}>
                {loading && <ActivityIndicator color="#00AEEC" />}
              </View>
            }
            onScroll={onScroll}
            scrollEventThrottle={16}
          />
        </View>

        {/* 直播列表 */}
        <View key="live" collapsable={false}>
          <Animated.FlatList
            ref={liveListRef as any}
            style={styles.listContainer}
            data={liveRows}
            keyExtractor={(item: any, index: number) =>
              `live-${index}-${item.left.roomid}-${item.right?.roomid ?? "empty"}`
            }
            contentContainerStyle={{
              paddingTop: insets.top + NAV_H + 6,
              paddingBottom: insets.bottom + 16,
            }}
            renderItem={renderLiveItem}
            ListHeaderComponent={
              <View>
                <FollowedLiveStrip />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.areaTabRow}
                  contentContainerStyle={styles.areaTabContent}
                >
                  {LIVE_AREAS.map((area) => (
                    <TouchableOpacity
                      key={area.id}
                      style={[
                        styles.areaTab,
                        liveAreaId === area.id && styles.areaTabActive,
                      ]}
                      onPress={() => handleLiveAreaPress(area.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.areaTabText,
                          liveAreaId === area.id && styles.areaTabTextActive,
                        ]}
                      >
                        {area.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={liveRefreshing}
                onRefresh={() => liveRefresh(liveAreaId)}
                progressViewOffset={insets.top + NAV_H}
              />
            }
            onEndReached={() => liveLoad()}
            onEndReachedThreshold={1.5}
            ListFooterComponent={
              liveLoading ? (
                <View style={styles.footer}>
                  <ActivityIndicator color="#00AEEC" />
                  <Text style={styles.footerText}>加载中...</Text>
                </View>
              ) : null
            }
            onScroll={onLiveScroll}
            scrollEventThrottle={16}
          />
        </View>
      </PagerView>

      {/* 绝对定位导航栏 */}
      <Animated.View
        style={[
          styles.navBar,
          {
            paddingTop: insets.top,
            transform: [{ translateY: currentHeaderTranslate }],
          },
        ]}
      >
        <Animated.View style={{ opacity: currentHeaderOpacity }}>
          {renderNavBar()}
        </Animated.View>
      </Animated.View>

      <LoginModal visible={showLogin} onClose={() => setShowLogin(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f5" },
  webShell: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  webNavBar: {
    paddingTop: 16,
    backgroundColor: "#f5f5f5",
    zIndex: 2,
    alignSelf: "center",
  },
  webScroll: {
    flex: 1,
    width: "100%",
  },
  webScrollContent: {
    alignItems: "center",
    paddingBottom: 28,
  },
  webContent: {
    width: "100%",
    maxWidth: 1180,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  webStack: {
    alignItems: "center",
  },
  pager: { flex: 1 },
  listContainer: { flex: 1 },
  navBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  header: {
    height: HEADER_H,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  webHeader: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#ececec",
  },
  logo: {
    fontSize: 20,
    fontWeight: "800",
    color: "#00AEEC",
    letterSpacing: -0.5,
    width: 72,
  },
  searchBar: {
    flex: 1,
    height: 34,
    backgroundColor: "#ffffff",
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  downloadBtn: {},
  searchPlaceholder: {
    fontSize: 13,
    color: "#8b8b8b",
    flex: 1,
  },
  headerRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ececec",
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#eee",
  },
  tabRow: {
    height: TAB_H,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  webTabRow: {
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 18,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ececec",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    height: TAB_H,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8b8b8b",
  },
  tabTextActive: {
    fontWeight: "700",
    color: "#111111",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 4,
    width: 20,
    height: 3,
    backgroundColor: "#111111",
    borderRadius: 4,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 2,
    justifyContent: "space-between",
    alignSelf: "center",
  },
  leftCol: { marginLeft: 4, marginRight: 4, flex: 1 },
  rightCol: { marginLeft: 4, marginRight: 4, flex: 1 },
  footer: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  footerText: { fontSize: 12, color: "#8c8c8c" },
  webLoadMoreBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#dddddd",
  },
  webLoadMoreText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "600",
  },
  areaTabRow: {
    marginBottom: 8,
  },
  areaTabContent: {
    paddingHorizontal: 10,
    gap: 8,
    alignItems: "center",
    height: 40,
  },
  areaTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7e7e7",
  },
  areaTabActive: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  areaTabText: {
    fontSize: 13,
    color: "#444",
    fontWeight: "500",
  },
  areaTabTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
});
