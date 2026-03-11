import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Platform, Modal, StatusBar, useWindowDimensions } from 'react-native';
// expo-screen-orientation requires a dev build; gracefully degrade in Expo Go
let ScreenOrientation: typeof import('expo-screen-orientation') | null = null;
try { ScreenOrientation = require('expo-screen-orientation'); } catch {}
import { NativeVideoPlayer } from './NativeVideoPlayer';
import type { PlayUrlResponse, DanmakuItem } from '../services/types';

interface Props {
  playData: PlayUrlResponse | null;
  qualities: { qn: number; desc: string }[];
  currentQn: number;
  onQualityChange: (qn: number) => void;
  onMiniPlayer?: () => void;
  bvid?: string;
  cid?: number;
  danmakus?: DanmakuItem[];
  onTimeUpdate?: (t: number) => void;
}

export function VideoPlayer({ playData, qualities, currentQn, onQualityChange, onMiniPlayer, bvid, cid, danmakus, onTimeUpdate }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const { width } = useWindowDimensions();
  const VIDEO_HEIGHT = width * 0.5625;
  const lastTimeRef = useRef(0);

  const handleEnterFullscreen = async () => {
    setFullscreen(true);
    if (Platform.OS !== 'web')
      await ScreenOrientation?.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
  };

  const handleExitFullscreen = async () => {
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
      <View style={{ width, height: VIDEO_HEIGHT, backgroundColor: '#000' }}>
        <video
          src={url}
          style={{ width: '100%', height: '100%', backgroundColor: '#000' } as any}
          controls
          playsInline
        />
      </View>
    );
  }

  return (
    <>
      {/* Portrait player: unmount when fullscreen */}
      {!fullscreen && (
        <NativeVideoPlayer
          playData={playData}
          qualities={qualities}
          currentQn={currentQn}
          onQualityChange={onQualityChange}
          onFullscreen={handleEnterFullscreen}
          onMiniPlayer={onMiniPlayer}
          bvid={bvid}
          cid={cid}
          isFullscreen={false}
          onTimeUpdate={(t) => { lastTimeRef.current = t; onTimeUpdate?.(t); }}
        />
      )}

      <Modal visible={fullscreen} animationType="fade" statusBarTranslucent>
        <StatusBar hidden />
        <View style={{ flex: 1, backgroundColor: '#000' }}>
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
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#fff', fontSize: 14 },
});
