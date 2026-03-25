import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DanmakuItem } from "../services/types";
import { danmakuColorToCss } from "../utils/danmaku";

interface Props {
  danmakus: DanmakuItem[];
  currentTime: number;
  visible: boolean;
  onToggle: () => void;
  style?: object | object[];
  hideHeader?: boolean;
  isLive?: boolean;
  maxItems?: number;
  giftCounts?: Record<string, number>;
  onExternalScroll?: (offsetY: number) => void;
}

interface DisplayedDanmaku extends DanmakuItem {
  _key: number;
  _fadeAnim: Animated.Value;
}

const DRIP_INTERVAL = 250;
const FAST_DRIP_INTERVAL = 100;
const QUEUE_FAST_THRESHOLD = 50;
const SEEK_THRESHOLD = 2;
const DANMAKU_LIST_INITIAL_NUM = 24;
const DANMAKU_LIST_MAX_BATCH = 24;
const DANMAKU_LIST_WINDOW_SIZE = 12;

// ─── 舰长等级 ───────────────────────────────────────────────────────────────────
const GUARD_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: "总督", color: "#E13979" },
  2: { text: "提督", color: "#7B68EE" },
  3: { text: "舰长", color: "#00D1F1" },
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatLiveTime(timeline?: string): string {
  if (!timeline) return "";
  const parts = timeline.split(" ");
  return parts[1]?.slice(0, 5) ?? ""; // "HH:MM"
}

export default function DanmakuList({
  danmakus,
  currentTime,
  visible,
  onToggle,
  style,
  hideHeader,
  isLive,
  maxItems = 100,
  giftCounts,
  onExternalScroll,
}: Props) {
  const flatListRef = useRef<FlatList>(null);
  const [displayedItems, setDisplayedItems] = useState<DisplayedDanmaku[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);

  const queueRef = useRef<DanmakuItem[]>([]);
  const lastTimeRef = useRef(0);
  const processedIndexRef = useRef(0);
  const keyCounterRef = useRef(0);
  const isAtBottomRef = useRef(true);
  const danmakusRef = useRef(danmakus);

  // Detect changes in the danmakus array
  useEffect(() => {
    const prev = danmakusRef.current;
    if (prev === danmakus) return;
    danmakusRef.current = danmakus;

    if (danmakus.length === 0) {
      queueRef.current = [];
      processedIndexRef.current = 0;
      lastTimeRef.current = 0;
      setDisplayedItems([]);
      setUnseenCount(0);
      isAtBottomRef.current = true;
      return;
    }

    if (isLive) {
      const newStart = processedIndexRef.current;
      if (danmakus.length > newStart) {
        queueRef.current.push(...danmakus.slice(newStart));
        processedIndexRef.current = danmakus.length;
      }
      return;
    }

    queueRef.current = [];
    processedIndexRef.current = 0;
    lastTimeRef.current = 0;
    setDisplayedItems([]);
    setUnseenCount(0);
    isAtBottomRef.current = true;
  }, [danmakus, isLive]);

  // Watch currentTime — only used in video mode
  useEffect(() => {
    if (danmakus.length === 0 || isLive) return;

    const prevTime = lastTimeRef.current;
    lastTimeRef.current = currentTime;

    if (Math.abs(currentTime - prevTime) > SEEK_THRESHOLD) {
      queueRef.current = [];
      processedIndexRef.current = 0;
      setDisplayedItems([]);
      setUnseenCount(0);
      isAtBottomRef.current = true;

      const catchUp = danmakus.filter((d) => d.time <= currentTime);
      const tail = catchUp.slice(-20);
      queueRef.current = tail;
      processedIndexRef.current = danmakus.findIndex(
        (d) => d.time > currentTime,
      );
      if (processedIndexRef.current === -1) {
        processedIndexRef.current = danmakus.length;
      }
      return;
    }

    const sorted = danmakus;
    let i = processedIndexRef.current;
    while (i < sorted.length && sorted[i].time <= currentTime) {
      queueRef.current.push(sorted[i]);
      i++;
    }
    processedIndexRef.current = i;
  }, [currentTime, danmakus, isLive]);

  // Drip interval — always running so queue is consumed even when tab is hidden
  useEffect(() => {
    const id = setInterval(
      () => {
        if (queueRef.current.length === 0) return;

        const item = queueRef.current.shift()!;
        const fadeAnim = new Animated.Value(0);
        const displayed: DisplayedDanmaku = {
          ...item,
          _key: keyCounterRef.current++,
          _fadeAnim: fadeAnim,
        };

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();

        setDisplayedItems((prev) => {
          const next = [...prev, displayed];
          return next.length > maxItems
            ? next.slice(-Math.floor(maxItems / 2))
            : next;
        });

        if (isAtBottomRef.current) {
          requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          });
        } else {
          setUnseenCount((c) => c + 1);
        }
      },
      queueRef.current.length > QUEUE_FAST_THRESHOLD
        ? FAST_DRIP_INTERVAL
        : DRIP_INTERVAL,
    );

    return () => clearInterval(id);
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      isAtBottomRef.current = distanceFromBottom < 40;
      if (isAtBottomRef.current) setUnseenCount(0);
      onExternalScroll?.(contentOffset.y);
    },
    [onExternalScroll],
  );

  const handleScrollBeginDrag = useCallback(() => {
    isAtBottomRef.current = false;
  }, []);

  const handlePillPress = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setUnseenCount(0);
    isAtBottomRef.current = true;
  }, []);

  // ─── Live mode render (B站-style chat) ─────────────────────────────────────
  const renderLiveItem = useCallback(({ item }: { item: DisplayedDanmaku }) => {
    const guard = item.guardLevel ? GUARD_LABELS[item.guardLevel] : null;
    const timeStr = formatLiveTime(item.timeline);
    return (
      <Animated.View style={[liveStyles.row, { opacity: item._fadeAnim }]}>
        {timeStr ? (
          <Text style={liveStyles.time}>{timeStr}</Text>
        ) : null}
        <View style={liveStyles.msgBody}>
          {guard && (
            <View style={[liveStyles.guardTag, { backgroundColor: guard.color }]}>
              <Text style={liveStyles.guardTagText}>{guard.text}</Text>
            </View>
          )}
          {item.isAdmin && (
            <View style={[liveStyles.guardTag, { backgroundColor: "#e53935" }]}>
              <Text style={liveStyles.guardTagText}>房管</Text>
            </View>
          )}
          {item.medalLevel != null && item.medalName && (
            <View style={liveStyles.medalTag}>
              <Text style={liveStyles.medalName}>{item.medalName}</Text>
              <View style={liveStyles.medalLvBox}>
                <Text style={liveStyles.medalLv}>{item.medalLevel}</Text>
              </View>
            </View>
          )}
          <Text style={liveStyles.uname} numberOfLines={1}>
            {item.uname ?? "匿名"}
          </Text>
          <Text style={liveStyles.colon}>：</Text>
          <Text style={liveStyles.text} numberOfLines={2}>
            {item.text}
          </Text>
        </View>
      </Animated.View>
    );
  }, []);

  // ─── Video mode render (original bubble) ───────────────────────────────────
  const renderVideoItem = useCallback(({ item }: { item: DisplayedDanmaku }) => {
    const dotColor = danmakuColorToCss(item.color);
    return (
      <Animated.View style={[styles.bubble, { opacity: item._fadeAnim }]}>
        <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
        <Text style={styles.bubbleText} numberOfLines={3}>
          {item.text}
        </Text>
        <Text style={styles.timestamp}>{formatTimestamp(item.time)}</Text>
      </Animated.View>
    );
  }, []);

  const keyExtractor = useCallback(
    (item: DisplayedDanmaku) => String(item._key),
    [],
  );

  return (
    <View style={[styles.container, style]}>
      {!hideHeader && (
        <TouchableOpacity
          style={styles.header}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <Ionicons
            name={visible ? "chatbubbles" : "chatbubbles-outline"}
            size={16}
            color="#00AEEC"
          />
          <Text style={styles.headerText}>
            弹幕 {danmakus.length > 0 ? `(${danmakus.length})` : ""}
          </Text>
          <Ionicons
            name={visible ? "chevron-up" : "chevron-down"}
            size={14}
            color="#999"
          />
        </TouchableOpacity>
      )}

      {visible && (
        <View style={styles.listWrapper}>
          <FlatList
            ref={flatListRef}
            data={displayedItems}
            keyExtractor={keyExtractor}
            renderItem={isLive ? renderLiveItem : renderVideoItem}
            style={isLive ? liveStyles.list : styles.list}
            contentContainerStyle={isLive ? liveStyles.listContent : styles.listContent}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            scrollEventThrottle={16}
            removeClippedSubviews={true}
            initialNumToRender={DANMAKU_LIST_INITIAL_NUM}
            maxToRenderPerBatch={DANMAKU_LIST_MAX_BATCH}
            windowSize={DANMAKU_LIST_WINDOW_SIZE}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {danmakus.length === 0 ? "暂无弹幕" : "弹幕将随视频播放显示"}
              </Text>
            }
          />
          {unseenCount > 0 && (
            <TouchableOpacity
              style={styles.pill}
              onPress={handlePillPress}
              activeOpacity={0.8}
            >
              <Text style={styles.pillText}>{unseenCount} 条新弹幕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

    </View>
  );
}

// ─── Video mode styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  headerText: {
    flex: 1,
    fontSize: 13,
    color: "#212121",
    fontWeight: "500",
  },
  listWrapper: {
    flex: 1,
    position: "relative",
  },
  list: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 2,
    gap: 8,
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  bubbleText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 11,
    color: "#bbb",
    marginTop: 1,
    flexShrink: 0,
  },
  pill: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    backgroundColor: "#00AEEC",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  empty: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    paddingVertical: 20,
  },
});

// ─── Live mode styles (B站-style chat) ────────────────────────────────────────
const liveStyles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: "#f9f9fb",
  },
  listContent: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f2",
  },
  time: {
    fontSize: 10,
    color: "#c0c0c0",
    width: 34,
    marginTop: 2,
    flexShrink: 0,
  },
  msgBody: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  guardTag: {
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 4,
  },
  guardTagText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  medalTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#e891ab",
    overflow: "hidden",
    marginRight: 4,
    height: 16,
  },
  medalName: {
    fontSize: 9,
    color: "#e891ab",
    paddingHorizontal: 3,
  },
  medalLvBox: {
    backgroundColor: "#e891ab",
    paddingHorizontal: 3,
    height: "100%",
    justifyContent: "center",
  },
  medalLv: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "700",
  },
  uname: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    maxWidth: 90,
  },
  colon: {
    fontSize: 12,
    color: "#666",
  },
  text: {
    fontSize: 13,
    color: "#212121",
    lineHeight: 18,
    flexShrink: 1,
  },
});

// ─── Gift bar styles ──────────────────────────────────────────────────────────
const giftStyles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    height: 72,
  },
  scroll: {
    paddingHorizontal: 6,
    alignItems: "center",
    height: "100%",
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    paddingVertical: 6,
  },
  iconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -8,
    alignSelf: "center",
    backgroundColor: "#FF6B81",
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 1,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
  },
  icon: {
    fontSize: 22,
    lineHeight: 28,
  },
  name: {
    fontSize: 10,
    color: "#333",
    fontWeight: "500",
    marginTop: 2,
  },
  price: {
    fontSize: 9,
    color: "#aaa",
    marginTop: 1,
  },
});
