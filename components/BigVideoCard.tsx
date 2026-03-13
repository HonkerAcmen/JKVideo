// components/BigVideoCard.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Animated,
  PanResponder,
} from "react-native";
import Video, { VideoRef } from "react-native-video";
import { Ionicons } from "@expo/vector-icons";
import { buildDashMpdUri } from "../utils/dash";
import { getPlayUrl, getVideoDetail } from "../services/bilibili";
import { proxyImageUrl } from "../utils/imageUrl";
import { formatCount, formatDuration } from "../utils/format";
import { LivePulse } from "./LivePulse";
import type { VideoItem } from "../services/types";

const HEADERS = {
  Referer: "https://www.bilibili.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const BAR_H = 3;
// Minimum horizontal distance (px) before treating the gesture as a seek
const SWIPE_THRESHOLD = 8;
// Full swipe across the screen = seek this many seconds
const SWIPE_SECONDS = 90;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

interface Props {
  item: VideoItem;
  isVisible: boolean;
  onPress: () => void;
}

export function BigVideoCard({ item, isVisible, onPress }: Props) {
  const { width: SCREEN_W } = useWindowDimensions();
  const THUMB_H = SCREEN_W * 0.5625;
  const mediaDimensions = { width: SCREEN_W - 8, height: THUMB_H };

  const [videoUrl, setVideoUrl] = useState<string | undefined>();
  const [isDash, setIsDash] = useState(false);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(true);
  const thumbOpacity = useRef(new Animated.Value(1)).current;

  const videoRef = useRef<VideoRef>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);

  // Refs for PanResponder (avoid stale closures)
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const seekingRef = useRef(false);
  const [seekLabel, setSeekLabel] = useState<string | null>(null);

  // Reset video state when the item changes
  useEffect(() => {
    setVideoUrl(undefined);
    setIsDash(false);
    setPaused(true);
    setMuted(true);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    thumbOpacity.setValue(1);
  }, [item.bvid]);

  const isLive = item.goto === 'live';

  // Fetch play URL when visible for the first time
  useEffect(() => {
    if (isLive) return;
    if (!isVisible || videoUrl) return;
    let cancelled = false;
    (async () => {
      try {
        let cid = item.cid;
        if (!cid) {
          const detail = await getVideoDetail(item.bvid);
          cid = detail.cid ?? detail.pages?.[0]?.cid;
        }
        if (!cid || cancelled) return;
        const playData = await getPlayUrl(item.bvid, cid, 16);
        if (cancelled) return;
        if (playData.dash) {
          if (!cancelled) setIsDash(true);
          try {
            const mpdUri = await buildDashMpdUri(playData, 16);
            if (!cancelled) setVideoUrl(mpdUri);
          } catch {
            if (!cancelled) setVideoUrl(playData.dash.video[0]?.baseUrl);
          }
        } else {
          if (!cancelled) setVideoUrl(playData.durl?.[0]?.url);
        }
      } catch (e) {
        console.warn("BigVideoCard: failed to load play URL", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isVisible, item.bvid]);

  // Pause/resume when visibility changes
  useEffect(() => {
    if (!videoUrl) return;
    setPaused(!isVisible);
    if (!isVisible) {
      setMuted(true);
      Animated.timing(thumbOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, videoUrl]);

  const handleVideoReady = () => {
    if (!isVisible) return;
    setPaused(false);
    Animated.timing(thumbOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Keep refs in sync
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Horizontal swipe to seek
  const swipeStartTime = useRef(0);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > SWIPE_THRESHOLD && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderGrant: () => {
        seekingRef.current = true;
        swipeStartTime.current = currentTimeRef.current;
      },
      onPanResponderMove: (_, gs) => {
        if (durationRef.current <= 0) return;
        const delta = (gs.dx / SCREEN_W) * SWIPE_SECONDS;
        const target = clamp(swipeStartTime.current + delta, 0, durationRef.current);
        setSeekLabel(formatDuration(Math.floor(target)));
      },
      onPanResponderRelease: (_, gs) => {
        if (durationRef.current > 0) {
          const delta = (gs.dx / SCREEN_W) * SWIPE_SECONDS;
          const target = clamp(swipeStartTime.current + delta, 0, durationRef.current);
          videoRef.current?.seek(target);
          setCurrentTime(target);
        }
        seekingRef.current = false;
        setSeekLabel(null);
      },
      onPanResponderTerminate: () => {
        seekingRef.current = false;
        setSeekLabel(null);
      },
    }),
  ).current;

  const progressRatio = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
  const bufferedRatio = duration > 0 ? clamp(buffered / duration, 0, 1) : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Media area */}
      <View style={[mediaDimensions, { position: "relative" }]}>
        {/* Video player — rendered first so it sits behind the thumbnail */}
        {videoUrl && (
          <Video
            ref={videoRef}
            source={
              isDash
                ? { uri: videoUrl, type: "mpd", headers: HEADERS }
                : { uri: videoUrl, headers: HEADERS }
            }
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            muted={muted}
            paused={paused}
            repeat
            controls={false}
            onReadyForDisplay={handleVideoReady}
            onProgress={({ currentTime: ct, seekableDuration: dur, playableDuration: buf }) => {
              if (!seekingRef.current) setCurrentTime(ct);
              if (dur > 0) setDuration(dur);
              setBuffered(buf);
            }}
          />
        )}

        {/* Thumbnail — on top of Video, fades out once video is ready */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: thumbOpacity }]}
          pointerEvents="none"
        >
          <Image
            source={{ uri: proxyImageUrl(item.pic) }}
            style={mediaDimensions}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Swipe gesture layer (video only) */}
        {!isLive && (
          <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
        )}

        {/* Seek time label */}
        {seekLabel && (
          <View style={styles.seekBadge}>
            <Text style={styles.seekText}>{seekLabel}</Text>
          </View>
        )}

        {/* Live badge */}
        {isLive && (
          <View style={styles.liveBadge}>
            <LivePulse />
            <Text style={styles.liveBadgeText}>直播中</Text>
          </View>
        )}

        <View style={styles.meta}>
          <Ionicons name={isLive ? "people" : "play"} size={11} color="#fff" />
          <Text style={styles.metaText}>
            {formatCount(isLive ? (item.online ?? 0) : (item.stat?.view ?? 0))}
          </Text>
        </View>

        {/* Duration badge on thumbnail (video only) */}
        {!isLive && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(item.duration)}
            </Text>
          </View>
        )}

        {/* Mute toggle — visible only when video is playing */}
        {videoUrl && !paused && (
          <TouchableOpacity
            style={styles.muteBtn}
            onPress={() => setMuted((m) => !m)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={muted ? "volume-mute" : "volume-high"}
              size={16}
              color="#fff"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar between video and info (video only) */}
      {!isLive && videoUrl && duration > 0 && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressLayer,
              { width: `${bufferedRatio * 100}%` as any, backgroundColor: "rgba(0,174,236,0.25)" },
            ]}
          />
          <View
            style={[
              styles.progressLayer,
              { width: `${progressRatio * 100}%` as any, backgroundColor: "#00AEEC" },
            ]}
          />
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.owner} numberOfLines={1}>
          {item.owner?.name ?? ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 4,
    marginBottom: 6,
    backgroundColor: "#fff",
    borderRadius: 6,
    overflow: "hidden",
  },
  liveBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    zIndex: 2,
  },
  liveBadgeText: { color: "#fff", fontSize: 10, fontWeight: "400" },
  durationBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 2,
  },
  durationText: { color: "#fff", fontSize: 10 },
  muteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  seekBadge: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 4,
  },
  seekText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  progressTrack: {
    height: BAR_H,
    backgroundColor: "rgba(0,0,0,0.08)",
    position: "relative",
  },
  progressLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    height: BAR_H,
  },
  info: { padding: 8 },
  title: { fontSize: 14, color: "#212121", lineHeight: 18, marginBottom: 4 },
  meta: {
    position: "absolute",
    bottom: 4,
    left: 4,
    paddingHorizontal: 4,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0,
    gap: 2,
    zIndex: 2,
  },
  metaText: { fontSize: 10, color: "#fff" },
  owner: { fontSize: 11, color: "#999", marginTop: 2 },
});
