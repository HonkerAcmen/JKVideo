import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Platform, Modal, StatusBar, useWindowDimensions, TouchableOpacity } from 'react-native';
// expo-screen-orientation requires a dev build; gracefully degrade in Expo Go
let ScreenOrientation: typeof import('expo-screen-orientation') | null = null;
try { ScreenOrientation = require('expo-screen-orientation'); } catch {}
import { NativeVideoPlayer, type NativeVideoPlayerRef } from './NativeVideoPlayer';
import type { PlayUrlResponse, DanmakuItem } from '../services/types';

interface Props {
  playData: PlayUrlResponse | null;
  qualities: { qn: number; desc: string }[];
  currentQn: number;
  onQualityChange: (qn: number) => void;
  bvid?: string;
  cid?: number;
  danmakus?: DanmakuItem[];
  onTimeUpdate?: (t: number) => void;
  webWidth?: number;
}

export function VideoPlayer({ playData, qualities, currentQn, onQualityChange, bvid, cid, danmakus, onTimeUpdate, webWidth }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [webPaused, setWebPaused] = useState(true);
  const [webCurrentTime, setWebCurrentTime] = useState(0);
  const [webDuration, setWebDuration] = useState(0);
  const [webPlaybackRate, setWebPlaybackRate] = useState(1);
  const [webProgressWidth, setWebProgressWidth] = useState(0);
  const [webContainerWidth, setWebContainerWidth] = useState(0);
  const { width, height } = useWindowDimensions();
  const playerWidth =
    Platform.OS === 'web'
      ? (webWidth && webWidth > 0 ? webWidth : webContainerWidth > 0 ? webContainerWidth : width)
      : width;
  const VIDEO_HEIGHT = playerWidth * 0.5625;
  const needsRotation = !ScreenOrientation && fullscreen;
  const lastTimeRef = useRef(0);
  const portraitRef = useRef<NativeVideoPlayerRef>(null);
  const webVideoRef = useRef<HTMLVideoElement | null>(null);

  const formatWebTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleEnterFullscreen = async () => {
    if (Platform.OS !== 'web')
      await ScreenOrientation?.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    setFullscreen(true);
  };

  const handleExitFullscreen = async () => {
    // 退出全屏：同步进度，竖屏一律暂停
    portraitRef.current?.seek(lastTimeRef.current);
    portraitRef.current?.setPaused(true);
    setFullscreen(false);
    if (Platform.OS !== 'web')
      await ScreenOrientation?.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  };

  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web')
        ScreenOrientation?.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const video = webVideoRef.current;
    if (!video) return;
    video.playbackRate = webPlaybackRate;
  }, [webPlaybackRate, playData]);

  if (!playData) {
    return (
      <View style={[{ width, height: VIDEO_HEIGHT, backgroundColor: '#000' }, styles.placeholder]}>
        <Text style={styles.placeholderText}>视频加载中...</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    const url = playData.durl?.[0]?.url ?? '';
    return (
      <View
        style={styles.webPlayerWrap}
        onLayout={(e) => setWebContainerWidth(e.nativeEvent.layout.width)}
      >
        <video
          ref={(node) => {
            webVideoRef.current = node;
          }}
          key={url}
          src={url}
          style={{ width: '100%', height: VIDEO_HEIGHT, backgroundColor: '#000', display: 'block' } as any}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            const target = e.currentTarget as HTMLVideoElement;
            setWebDuration(target.duration || 0);
            setWebPaused(target.paused);
          }}
          onTimeUpdate={(e) => {
            const target = e.currentTarget as HTMLVideoElement;
            setWebCurrentTime(target.currentTime || 0);
            setWebPaused(target.paused);
            onTimeUpdate?.(target.currentTime || 0);
          }}
          onPlay={() => setWebPaused(false)}
          onPause={() => setWebPaused(true)}
        />
      </View>
    );
  }

  return (
    <>
      {/* Portrait player: always mounted, force-paused while fullscreen is active */}
      <NativeVideoPlayer
        ref={portraitRef}
        playData={playData}
        qualities={qualities}
        currentQn={currentQn}
        onQualityChange={onQualityChange}
        onFullscreen={handleEnterFullscreen}
        bvid={bvid}
        cid={cid}
        isFullscreen={false}
        forcePaused={fullscreen}
        initialTime={lastTimeRef.current}
        onTimeUpdate={(t) => { lastTimeRef.current = t; onTimeUpdate?.(t); }}
      />

      <Modal visible={fullscreen} animationType="none" statusBarTranslucent>
        <StatusBar hidden />
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
          <View style={needsRotation
            ? { width: height, height: width, transform: [{ rotate: '90deg' }] }
            : { flex: 1, width: '100%' }
          }>
            <NativeVideoPlayer
              playData={playData}
              qualities={qualities}
              currentQn={currentQn}
              onQualityChange={onQualityChange}
              onFullscreen={handleExitFullscreen}
              bvid={bvid}
              cid={cid}
              danmakus={danmakus}
              isFullscreen={true}
              initialTime={lastTimeRef.current}
              onTimeUpdate={(t) => { lastTimeRef.current = t; onTimeUpdate?.(t); }}
              style={needsRotation ? { width: height, height: width } : { flex: 1 }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#fff', fontSize: 14 },
  webPlayerWrap: {
    width: '100%',
    backgroundColor: '#071019',
    alignSelf: 'stretch',
  },
});
