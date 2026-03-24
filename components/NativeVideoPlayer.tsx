import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { formatDuration } from "../utils/format";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Image,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import Video, { VideoRef } from "react-native-video";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type {
  PlayUrlResponse,
  VideoShotData,
  DanmakuItem,
} from "../services/types";
import { buildDashMpdUri } from "../utils/dash";
import { getVideoShot } from "../services/bilibili";
import DanmakuOverlay from "./DanmakuOverlay";

const BAR_H = 3;
// 进度球尺寸
const BALL = 12;
// 活跃状态下的拖动球增大尺寸，提升触控体验
const BALL_ACTIVE = 16;
const HIDE_DELAY = 3000;
const CONTROL_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const LONG_PRESS_RATE = 2;
const LONG_PRESS_DELAY = 260;
const TWO_FINGER_SWIPE_THRESHOLD = 42;
const MULTI_TAP_MAX_DURATION = 320;
const MULTI_TAP_MAX_MOVEMENT = 36;
const MULTI_DOUBLE_TAP_INTERVAL = 420;
const TAP_MOVE_THRESHOLD = 10;

const HEADERS = {
  Referer: "https://www.bilibili.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
//
function findFrameByTime(index: number[], seekTime: number): number {
  let lo = 0,
    hi = index.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (index[mid] <= seekTime) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export interface NativeVideoPlayerRef {
  seek: (t: number) => void;
  setPaused: (v: boolean) => void;
}

type FullscreenMode = "inline" | "portrait" | "landscape";

interface Props {
  playData: PlayUrlResponse | null;
  qualities: { qn: number; desc: string }[];
  currentQn: number;
  onQualityChange: (qn: number) => void;
  onFullscreen: () => void;
  style?: object;
  bvid?: string;
  cid?: number;
  danmakus?: DanmakuItem[];
  isFullscreen?: boolean;
  fullscreenMode?: FullscreenMode;
  onTimeUpdate?: (t: number) => void;
  initialTime?: number;
  forcePaused?: boolean;
  onEnterPortraitFullscreen?: () => void;
  onRotateToLandscape?: () => void;
}

export const NativeVideoPlayer = forwardRef<NativeVideoPlayerRef, Props>(
  function NativeVideoPlayer(
    {
      playData,
      qualities,
      currentQn,
      onQualityChange,
      onFullscreen,
      style,
      bvid,
      cid,
      danmakus,
      isFullscreen,
      fullscreenMode = "inline",
      onTimeUpdate,
      initialTime,
      forcePaused,
      onEnterPortraitFullscreen,
      onRotateToLandscape,
    }: Props,
    ref,
  ) {
    const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
    const VIDEO_H = SCREEN_W * 0.5625;

    const [resolvedUrl, setResolvedUrl] = useState<string | undefined>();
    const isDash = !!playData?.dash;

    const [showControls, setShowControls] = useState(true);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [paused, setPaused] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const durationRef = useRef(0);

    const [showQuality, setShowQuality] = useState(false);

    const [buffered, setBuffered] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);
    const isSeekingRef = useRef(false);
    const [touchX, setTouchX] = useState<number | null>(null);
    const touchXRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const barOffsetX = useRef(0);
    const barWidthRef = useRef(300);
    const trackRef = useRef<View>(null);

    const [shots, setShots] = useState<VideoShotData | null>(null);
    const [showDanmaku, setShowDanmaku] = useState(true);
    const [isLongPressing, setIsLongPressing] = useState(false);

    const videoRef = useRef<VideoRef>(null);
    const longPressTriggeredRef = useRef(false);
    const twoFingerStartYRef = useRef<number | null>(null);
    const twoFingerStartXRef = useRef<number | null>(null);
    const twoFingerStartTimeRef = useRef<number | null>(null);
    const twoFingerMaxOffsetRef = useRef(0);
    const twoFingerMinDeltaYRef = useRef(0);
    const twoFingerMaxDeltaYRef = useRef(0);
    const twoFingerTriggeredRef = useRef(false);
    const gestureTouchCountRef = useRef(0);
    const lastThreeFingerTapAtRef = useRef<number | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const singleTouchMovedRef = useRef(false);
    const singleTouchStartXRef = useRef<number | null>(null);
    const singleTouchStartYRef = useRef<number | null>(null);
    const maxGestureTouchCountRef = useRef(0);

    useImperativeHandle(ref, () => ({
      seek: (t: number) => {
        videoRef.current?.seek(t);
      },
      setPaused: (v: boolean) => {
        setPaused(v);
      },
    }));

    const currentDesc =
      qualities.find((q) => q.qn === currentQn)?.desc ??
      String(currentQn || "HD");

    // 解析播放链接，dash 需要构建 mpd uri，普通链接直接取第一个 durl。使用 useEffect 监听 playData 和 currentQn 变化，确保每次切换视频或清晰度时都能正确更新播放链接。错误处理逻辑保证即使 dash mpd 构建失败也能回退到普通链接，提升兼容性。
    useEffect(() => {
      if (!playData) {
        setResolvedUrl(undefined);
        return;
      }
      if (isDash) {
        buildDashMpdUri(playData, currentQn)
          .then(setResolvedUrl)
          .catch(() => setResolvedUrl(playData.dash!.video[0]?.baseUrl));
      } else {
        setResolvedUrl(playData.durl?.[0]?.url);
      }
    }, [playData, currentQn]);
    // 获取视频截图数据，供进度条预览使用。依赖 bvid 和 cid，确保在视频切换时重新获取截图。使用 cancelled 标志避免在组件卸载后更新状态，防止内存泄漏和潜在的错误。
    useEffect(() => {
      if (!bvid || !cid) return;
      let cancelled = false;
      getVideoShot(bvid, cid).then((shotData) => {
        if (cancelled) return;
        if (shotData?.image?.length) {
          setShots(shotData);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [bvid, cid]);

    useEffect(() => {
      durationRef.current = duration;
    }, [duration]);

    // 控制栏自动隐藏逻辑：每次用户交互后重置计时器，3秒无交互则隐藏。使用 useRef 存储计时器 ID 和拖动状态，避免闭包问题导致的计时器失效或误触发。
    const resetHideTimer = useCallback(() => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (!isSeekingRef.current) {
        hideTimer.current = setTimeout(
          () => setShowControls(false),
          HIDE_DELAY,
        );
      }
    }, []);
    // 显示控制栏并重置隐藏计时器，确保用户每次交互后都有足够时间查看控制栏。依赖 resetHideTimer 保持稳定引用，避免不必要的重新渲染。
    const showAndReset = useCallback(() => {
      setShowControls(true);
      resetHideTimer();
    }, [resetHideTimer]);

    // 点击视频区域切换控制栏显示状态，显示时重置隐藏计时器，隐藏时直接隐藏。使用 useCallback 优化性能，避免不必要的函数重新创建。
    const handleTap = useCallback(() => {
      setShowControls((prev) => {
        if (!prev) {
          resetHideTimer();
          return true;
        }
        if (hideTimer.current) clearTimeout(hideTimer.current);
        return false;
      });
    }, [resetHideTimer]);

    const handleLongPress = useCallback(() => {
      if (paused || forcePaused) return;
      longPressTriggeredRef.current = true;
      setIsLongPressing(true);
      setPlaybackRate(LONG_PRESS_RATE);
      setShowControls(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    }, [paused, forcePaused]);

    const handlePressOut = useCallback(() => {
      if (!longPressTriggeredRef.current) return;
      longPressTriggeredRef.current = false;
      setIsLongPressing(false);
      setPlaybackRate(1);
      resetHideTimer();
    }, [resetHideTimer]);

    const clearLongPressTimer = useCallback(() => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }, []);

    const resetTwoFingerGesture = useCallback(() => {
      twoFingerStartYRef.current = null;
      twoFingerStartXRef.current = null;
      twoFingerStartTimeRef.current = null;
      twoFingerMaxOffsetRef.current = 0;
      twoFingerMinDeltaYRef.current = 0;
      twoFingerMaxDeltaYRef.current = 0;
      twoFingerTriggeredRef.current = false;
      gestureTouchCountRef.current = 0;
      maxGestureTouchCountRef.current = 0;
    }, []);

    const handleSurfaceTouchStart = useCallback(
      (e: any) => {
        const touches = e.nativeEvent.touches ?? [];
        gestureTouchCountRef.current = touches.length;
        maxGestureTouchCountRef.current = Math.max(
          maxGestureTouchCountRef.current,
          touches.length,
        );
        if (touches.length === 1) {
          const touch = touches[0];
          singleTouchMovedRef.current = false;
          singleTouchStartXRef.current = touch.pageX;
          singleTouchStartYRef.current = touch.pageY;
          clearLongPressTimer();
          if (!paused && !forcePaused) {
            longPressTimerRef.current = setTimeout(() => {
              handleLongPress();
            }, LONG_PRESS_DELAY);
          }
        } else if (touches.length >= 2) {
          clearLongPressTimer();
          const avgX = (touches[0].pageX + touches[1].pageX) / 2;
          const avgY = (touches[0].pageY + touches[1].pageY) / 2;
          twoFingerStartXRef.current = avgX;
          twoFingerStartYRef.current = avgY;
          twoFingerStartTimeRef.current = Date.now();
          twoFingerMaxOffsetRef.current = 0;
          twoFingerMinDeltaYRef.current = 0;
          twoFingerMaxDeltaYRef.current = 0;
          twoFingerTriggeredRef.current = false;
        } else {
          clearLongPressTimer();
          resetTwoFingerGesture();
        }
      },
      [
        clearLongPressTimer,
        forcePaused,
        handleLongPress,
        paused,
        resetTwoFingerGesture,
      ],
    );

    const handleSurfaceTouchMove = useCallback(
      (e: any) => {
        const touches = e.nativeEvent.touches ?? [];
        gestureTouchCountRef.current = touches.length;
        maxGestureTouchCountRef.current = Math.max(
          maxGestureTouchCountRef.current,
          touches.length,
        );
        if (touches.length === 1) {
          const touch = touches[0];
          if (
            singleTouchStartXRef.current !== null &&
            singleTouchStartYRef.current !== null
          ) {
            const dx = touch.pageX - singleTouchStartXRef.current;
            const dy = touch.pageY - singleTouchStartYRef.current;
            if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD) {
              singleTouchMovedRef.current = true;
              clearLongPressTimer();
            }
          }
          return;
        }
        clearLongPressTimer();
        if (touches.length >= 2) {
          const avgX = (touches[0].pageX + touches[1].pageX) / 2;
          const avgY = (touches[0].pageY + touches[1].pageY) / 2;
          if (
            twoFingerStartYRef.current === null ||
            twoFingerStartXRef.current === null
          ) {
            twoFingerStartXRef.current = avgX;
            twoFingerStartYRef.current = avgY;
            if (twoFingerStartTimeRef.current === null) {
              twoFingerStartTimeRef.current = Date.now();
            }
            twoFingerMaxOffsetRef.current = 0;
            twoFingerMinDeltaYRef.current = 0;
            twoFingerMaxDeltaYRef.current = 0;
            return;
          }
          if (twoFingerTriggeredRef.current) {
            return;
          }
          const deltaX = avgX - twoFingerStartXRef.current;
          const deltaY = avgY - twoFingerStartYRef.current;
          const distance = Math.hypot(deltaX, deltaY);
          twoFingerMaxOffsetRef.current = Math.max(
            twoFingerMaxOffsetRef.current,
            distance,
          );
          twoFingerMinDeltaYRef.current = Math.min(
            twoFingerMinDeltaYRef.current,
            deltaY,
          );
          twoFingerMaxDeltaYRef.current = Math.max(
            twoFingerMaxDeltaYRef.current,
            deltaY,
          );

          if (
            !isFullscreen &&
            onEnterPortraitFullscreen &&
            twoFingerMaxDeltaYRef.current > TWO_FINGER_SWIPE_THRESHOLD
          ) {
            twoFingerTriggeredRef.current = true;
            onEnterPortraitFullscreen();
          } else if (
            isFullscreen &&
            twoFingerMinDeltaYRef.current < -TWO_FINGER_SWIPE_THRESHOLD
          ) {
            twoFingerTriggeredRef.current = true;
            onFullscreen();
          }
        } else if (touches.length < 2) {
          twoFingerStartYRef.current = null;
          twoFingerStartXRef.current = null;
        }
      },
      [clearLongPressTimer, isFullscreen, onEnterPortraitFullscreen, onFullscreen],
    );

    const handleSurfaceTouchEnd = useCallback((e?: any) => {
      const remainingTouches = e?.nativeEvent?.touches?.length ?? 0;
      if (remainingTouches > 0) {
        gestureTouchCountRef.current = remainingTouches;
        maxGestureTouchCountRef.current = Math.max(
          maxGestureTouchCountRef.current,
          remainingTouches,
        );
        return;
      }
      clearLongPressTimer();
      const now = Date.now();
      const startedAt = twoFingerStartTimeRef.current;
      const shouldEnterPortraitFullscreen =
        !isFullscreen &&
        !!onEnterPortraitFullscreen &&
        !twoFingerTriggeredRef.current &&
        twoFingerMaxDeltaYRef.current > TWO_FINGER_SWIPE_THRESHOLD;
      const shouldExitFullscreen =
        isFullscreen &&
        !twoFingerTriggeredRef.current &&
        twoFingerMinDeltaYRef.current < -TWO_FINGER_SWIPE_THRESHOLD;
      const isThreeFingerTap =
        isFullscreen &&
        !!danmakus?.length &&
        !twoFingerTriggeredRef.current &&
        !shouldExitFullscreen &&
        maxGestureTouchCountRef.current >= 3 &&
        startedAt !== null &&
        now - startedAt <= MULTI_TAP_MAX_DURATION &&
        twoFingerMaxOffsetRef.current <= MULTI_TAP_MAX_MOVEMENT;

      if (shouldEnterPortraitFullscreen) {
        twoFingerTriggeredRef.current = true;
        onEnterPortraitFullscreen?.();
        lastThreeFingerTapAtRef.current = null;
      } else if (shouldExitFullscreen) {
        twoFingerTriggeredRef.current = true;
        onFullscreen();
        lastThreeFingerTapAtRef.current = null;
      } else if (isThreeFingerTap) {
        const lastTapAt = lastThreeFingerTapAtRef.current;
        if (
          lastTapAt !== null &&
          now - lastTapAt <= MULTI_DOUBLE_TAP_INTERVAL
        ) {
          lastThreeFingerTapAtRef.current = null;
          setShowDanmaku((prev) => !prev);
          setShowControls(true);
          resetHideTimer();
        } else {
          lastThreeFingerTapAtRef.current = now;
        }
      } else {
        lastThreeFingerTapAtRef.current = null;
        if (
          gestureTouchCountRef.current <= 1 &&
          !singleTouchMovedRef.current &&
          !longPressTriggeredRef.current
        ) {
          handleTap();
        }
      }
      if (longPressTriggeredRef.current) {
        handlePressOut();
      }
      singleTouchStartXRef.current = null;
      singleTouchStartYRef.current = null;
      singleTouchMovedRef.current = false;
      resetTwoFingerGesture();
    }, [
      clearLongPressTimer,
      danmakus?.length,
      handlePressOut,
      handleTap,
      isFullscreen,
      resetHideTimer,
      resetTwoFingerGesture,
    ]);

    useEffect(() => {
      if (paused || forcePaused) {
        clearLongPressTimer();
        longPressTriggeredRef.current = false;
        setIsLongPressing(false);
        setPlaybackRate(1);
      }
    }, [clearLongPressTimer, paused, forcePaused]);

    // 组件卸载时清理隐藏计时器，避免内存泄漏和潜在的状态更新错误。依赖项为空数组确保只在挂载和卸载时执行一次。
    useEffect(() => {
      resetHideTimer();
      return () => {
        clearLongPressTimer();
        if (hideTimer.current) clearTimeout(hideTimer.current);
      };
    }, [clearLongPressTimer, resetHideTimer]);

    const measureTrack = useCallback(() => {
      trackRef.current?.measureInWindow((x, _y, w) => {
        if (w > 0) {
          barOffsetX.current = x;
          barWidthRef.current = w;
        }
      });
    }, []);
    //  使用 PanResponder 实现进度条拖动，支持在拖动过程中显示预览图。通过 touchXRef 和 rafRef 优化拖动性能，避免频繁更新状态导致的卡顿。用户松开拖动时，根据最终位置计算对应的时间点并跳转，同时清理状态和隐藏预览图。
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (_, gs) => {
          isSeekingRef.current = true;
          setIsSeeking(true);
          setShowControls(true);
          if (hideTimer.current) clearTimeout(hideTimer.current);
          const x = clamp(gs.x0 - barOffsetX.current, 0, barWidthRef.current);
          touchXRef.current = x;
          setTouchX(x);
        },
        onPanResponderMove: (_, gs) => {
          touchXRef.current = clamp(
            gs.moveX - barOffsetX.current,
            0,
            barWidthRef.current,
          );
          if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(() => {
              setTouchX(touchXRef.current);
              rafRef.current = null;
            });
          }
        },
        //  用户松开拖动，或拖动被中断（如来电），都视为结束拖动，需要清理状态和隐藏预览
        onPanResponderRelease: (_, gs) => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          const ratio = clamp(
            (gs.moveX - barOffsetX.current) / barWidthRef.current,
            0,
            1,
          );
          const t = ratio * durationRef.current;
          videoRef.current?.seek(t);
          setCurrentTime(t);
          touchXRef.current = null;
          setTouchX(null);
          isSeekingRef.current = false;
          setIsSeeking(false);
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(
            () => setShowControls(false),
            HIDE_DELAY,
          );
        },
        onPanResponderTerminate: () => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          touchXRef.current = null;
          setTouchX(null);
          isSeekingRef.current = false;
          setIsSeeking(false);
        },
      }),
    ).current;
    // 进度条上触摸位置对应的时间点比例，0-1。非拖动状态为 null
    const touchRatio =
      touchX !== null ? clamp(touchX / barWidthRef.current, 0, 1) : null;
    const progressRatio =
      duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
    const bufferedRatio = duration > 0 ? clamp(buffered / duration, 0, 1) : 0;

    const THUMB_DISPLAY_W = 120; // scaled display width

    const renderThumbnail = () => {
      if (touchRatio === null || !shots || !isSeeking) return null;
      const {
        img_x_size: TW,
        img_y_size: TH,
        img_x_len,
        img_y_len,
        image,
        index,
      } = shots;
      const framesPerSheet = img_x_len * img_y_len;
      const totalFrames = framesPerSheet * image.length;
      const seekTime = touchRatio * duration;
      // 通过时间戳索引找到最接近的帧，若无索引则均匀映射到总帧数上
      const frameIdx =
        index?.length && duration > 0
          ? clamp(findFrameByTime(index, seekTime), 0, index.length - 1)
          : clamp(
              Math.floor(touchRatio * (totalFrames - 1)),
              0,
              totalFrames - 1,
            );

      const sheetIdx = Math.floor(frameIdx / framesPerSheet);
      const local = frameIdx % framesPerSheet;
      const col = local % img_x_len;
      const row = Math.floor(local / img_x_len);
      console.log("[thumb]", {
        seekTime,
        duration,
        indexLen: index?.length,
        frameIdx,
        totalFrames,
        sheetIdx,
        col,
        row,
      });
      //  根据单帧图尺寸和预设的显示宽度计算缩放后的显示尺寸，保持宽高比
      const scale = THUMB_DISPLAY_W / TW;
      const DW = THUMB_DISPLAY_W;
      const DH = Math.round(TH * scale);

      const trackLeft = barOffsetX.current;
      const absLeft = clamp(
        trackLeft + (touchX ?? 0) - DW / 2,
        0,
        SCREEN_W - DW,
      );
      // 兼容处理图床地址，确保以 http(s) 协议开头
      const sheetUrl = image[sheetIdx].startsWith("//")
        ? `https:${image[sheetIdx]}`
        : image[sheetIdx];
      return (
        <View
          style={[styles.thumbPreview, { left: absLeft, width: DW }]}
          pointerEvents="none"
        >
          <View
            style={{
              width: DW,
              height: DH,
              overflow: "hidden",
              borderRadius: 4,
            }}
          >
            <Image
              source={{ uri: sheetUrl, headers: HEADERS }}
              style={{
                position: "absolute",
                width: TW * img_x_len * scale,
                height: TH * img_y_len * scale,
                left: -col * DW,
                top: -row * DH,
              }}
            />
          </View>
          <Text style={styles.thumbTime}>
            {formatDuration(Math.floor(seekTime))}
          </Text>
        </View>
      );
    };

    return (
      <View
        style={[
          isFullscreen
            ? styles.fsContainer
            : [styles.container, { width: SCREEN_W, height: VIDEO_H }],
          style,
        ]}
      >
        {resolvedUrl ? (
          <Video
            key={resolvedUrl}
            ref={videoRef}
            source={
              isDash
                ? { uri: resolvedUrl, type: "mpd", headers: HEADERS }
                : { uri: resolvedUrl, headers: HEADERS }
            }
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            controls={false}
            paused={!!(forcePaused || paused)}
            rate={playbackRate}
            onProgress={({
              currentTime: ct,
              seekableDuration: dur,
              playableDuration: buf,
            }) => {
              setCurrentTime(ct);
              if (dur > 0) setDuration(dur);
              setBuffered(buf);
              onTimeUpdate?.(ct);
            }}
            onLoad={() => {
              if (initialTime && initialTime > 0) {
                videoRef.current?.seek(initialTime);
              }
            }}
            onError={(e) => {
              // 杜比视界播放失败时自动降级到 1080P
              if (currentQn === 126) {
                onQualityChange(80);
                return;
              }
              console.warn("Video playback error:", e);
            }}
          />
        ) : (
          <View style={styles.placeholder} />
        )}

        {isFullscreen && !!danmakus?.length && (
          <DanmakuOverlay
            danmakus={danmakus}
            currentTime={currentTime}
            screenWidth={SCREEN_W}
            screenHeight={SCREEN_H}
            visible={showDanmaku}
          />
        )}

        {isFullscreen && !!danmakus?.length && (
          <TouchableOpacity
            style={[
              styles.danmakuFab,
              showDanmaku ? styles.danmakuFabActive : styles.danmakuFabMuted,
            ]}
            onPress={() => {
              setShowDanmaku((prev) => !prev);
              setShowControls(true);
              resetHideTimer();
            }}
            hitSlop={CONTROL_HIT_SLOP}
          >
            <Ionicons
              name={showDanmaku ? "chatbubbles" : "chatbubbles-outline"}
              size={17}
              color={showDanmaku ? "#0A5C91" : "#6B7C8F"}
            />
            <Text
              style={[
                styles.danmakuFabText,
                showDanmaku
                  ? styles.danmakuFabTextActive
                  : styles.danmakuFabTextMuted,
              ]}
            >
              {showDanmaku ? "弹幕开" : "弹幕关"}
            </Text>
          </TouchableOpacity>
        )}

        <View
          style={StyleSheet.absoluteFill}
          onTouchStart={handleSurfaceTouchStart}
          onTouchMove={handleSurfaceTouchMove}
          onTouchEnd={handleSurfaceTouchEnd}
          onTouchCancel={handleSurfaceTouchEnd}
        />

        {isLongPressing && (
          <View style={styles.longPressBadge} pointerEvents="none">
            <Ionicons name="play-forward" size={16} color="#fff" />
            <Text style={styles.longPressText}>{LONG_PRESS_RATE}x 快进中</Text>
          </View>
        )}

        {showControls && (
          <>
            {/*  小窗口 */}
            <LinearGradient
              colors={["rgba(0,0,0,0.55)", "transparent"]}
              style={styles.topBar}
              pointerEvents="box-none"
            ></LinearGradient>

            <TouchableOpacity
              style={styles.centerBtn}
              onPress={() => {
                setPaused((p) => !p);
                showAndReset();
              }}
              hitSlop={CONTROL_HIT_SLOP}
            >
              <View style={styles.centerBtnBg}>
                <Ionicons
                  name={paused ? "play" : "pause"}
                  size={28}
                  color="#fff"
                />
              </View>
            </TouchableOpacity>

            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.82)"]}
              style={styles.bottomBar}
              pointerEvents="box-none"
            >
              <View
                ref={trackRef}
                style={styles.trackWrapper}
                onLayout={measureTrack}
                {...panResponder.panHandlers}
              >
                <View style={styles.track}>
                  <View
                    style={[
                      styles.trackLayer,
                      {
                        width: `${bufferedRatio * 100}%` as any,
                        backgroundColor: "rgba(255,255,255,0.35)",
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.trackLayer,
                      {
                        width: `${progressRatio * 100}%` as any,
                        backgroundColor: "#00AEEC",
                      },
                    ]}
                  />
                </View>
                {isSeeking && touchX !== null ? (
                  <View
                    style={[
                      styles.ball,
                      styles.ballActive,
                      { left: touchX - BALL_ACTIVE / 2 },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.ball,
                      { left: progressRatio * barWidthRef.current - BALL / 2 },
                    ]}
                  />
                )}
              </View>
              <View style={styles.ctrlRow}>
                <View style={styles.ctrlLeft}>
                  <TouchableOpacity
                    onPress={() => {
                      setPaused((p) => !p);
                      showAndReset();
                    }}
                    style={styles.primaryCtrlBtn}
                    hitSlop={CONTROL_HIT_SLOP}
                  >
                    <Ionicons
                      name={paused ? "play" : "pause"}
                      size={18}
                      color="#fff"
                    />
                  </TouchableOpacity>
                  <Text style={styles.timeText}>
                    {formatDuration(Math.floor(currentTime))}
                  </Text>
                  <Text style={styles.timeDivider}>/</Text>
                  <Text style={styles.timeTextMuted}>{formatDuration(duration)}</Text>
                </View>
                <View style={styles.ctrlRight}>
                  <TouchableOpacity
                    style={styles.chipCtrlBtn}
                    onPress={() => setShowQuality(true)}
                    hitSlop={CONTROL_HIT_SLOP}
                  >
                    <Text style={styles.qualityText}>{currentDesc}</Text>
                  </TouchableOpacity>
                  {fullscreenMode !== "landscape" && onRotateToLandscape && (
                    <TouchableOpacity
                      style={styles.iconCtrlBtn}
                      onPress={onRotateToLandscape}
                      hitSlop={CONTROL_HIT_SLOP}
                    >
                      <Ionicons
                        name="phone-landscape"
                        size={18}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.iconCtrlBtn}
                    onPress={onFullscreen}
                    hitSlop={CONTROL_HIT_SLOP}
                  >
                    <Ionicons
                      name={isFullscreen ? "contract" : "expand"}
                      size={18}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.controlHintRow}>
                <Text style={styles.controlHintText}>
                  双指下滑全屏 · 双指上滑退出
                </Text>
              </View>
            </LinearGradient>
          </>
        )}

        {renderThumbnail()}
        {/* 选清晰度 */}
        <Modal visible={showQuality} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setShowQuality(false)}
          >
            <View style={styles.qualityList}>
              <Text style={styles.qualityTitle}>选择清晰度</Text>
              {qualities.map((q) => (
                <TouchableOpacity
                  key={q.qn}
                  style={styles.qualityItem}
                  onPress={() => {
                    setShowQuality(false);
                    onQualityChange(q.qn);
                    showAndReset();
                  }}
                  hitSlop={CONTROL_HIT_SLOP}
                >
                  <Text
                    style={[
                      styles.qualityItemText,
                      q.qn === currentQn && styles.qualityItemActive,
                    ]}
                  >
                    {q.desc}
                    {q.qn === 126 ? " DV" : ""}
                  </Text>
                  {q.qn === currentQn && (
                    <Ionicons name="checkmark" size={16} color="#00AEEC" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: { backgroundColor: "#000" },
  fsContainer: { flex: 1, backgroundColor: "#000" },
  placeholder: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  topBtn: { padding: 6 },
  longPressBadge: {
    position: "absolute",
    top: 18,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,174,236,0.88)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  longPressText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  centerBtn: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -28 }, { translateY: -28 }],
  },
  centerBtnBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 12,
    paddingTop: 40,
  },
  thumbPreview: { position: "absolute", bottom: 64, alignItems: "center" },
  thumbTime: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  trackWrapper: {
    marginHorizontal: 14,
    height: BAR_H + BALL_ACTIVE + 2,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  trackLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    height: BAR_H,
  },
  ball: {
    position: "absolute",
    top: (BAR_H + BALL_ACTIVE) / 2 - BALL / 2 + 1,
    width: BALL,
    height: BALL,
    borderRadius: BALL / 2,
    backgroundColor: "#fff",
    elevation: 3,
  },
  ballActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#00AEEC",
    top: -1,
  },
  ctrlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginTop: 10,
  },
  ctrlLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  ctrlRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 12,
  },
  primaryCtrlBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  iconCtrlBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipCtrlBtn: {
    minWidth: 54,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  timeTextMuted: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "500",
  },
  timeDivider: {
    color: "rgba(255,255,255,0.46)",
    fontSize: 12,
    marginHorizontal: 5,
    fontWeight: "600",
  },
  qualityText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  controlHintRow: {
    paddingHorizontal: 14,
    marginTop: 8,
  },
  controlHintText: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 10,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  qualityList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 180,
  },
  qualityTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#212121",
    paddingVertical: 10,
    textAlign: "center",
  },
  qualityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  qualityItemText: { fontSize: 14, color: "#333" },
  qualityItemActive: { color: "#00AEEC", fontWeight: "700" },
  danmakuFab: {
    position: "absolute",
    top: 18,
    right: 16,
    zIndex: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  danmakuFabActive: {
    backgroundColor: "rgba(234,247,255,0.94)",
    borderColor: "rgba(0,174,236,0.34)",
  },
  danmakuFabMuted: {
    backgroundColor: "rgba(242,246,250,0.94)",
    borderColor: "rgba(107,124,143,0.24)",
  },
  danmakuFabText: {
    fontSize: 12,
    fontWeight: "700",
  },
  danmakuFabTextActive: {
    color: "#0A5C91",
  },
  danmakuFabTextMuted: {
    color: "#6B7C8F",
  },
});
