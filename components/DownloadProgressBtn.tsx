import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDownloadStore } from '../store/downloadStore';

const SIZE = 32;   // 环外径
const RING = 3;    // 环宽
const BLUE = '#00AEEC';
const INNER = SIZE - RING * 2;

interface Props {
  onPress: () => void;
}

export function DownloadProgressBtn({ onPress }: Props) {
  const tasks = useDownloadStore((s) => s.tasks);
  const downloading = Object.values(tasks).filter((t) => t.status === 'downloading');
  const hasDownloading = downloading.length > 0;

  const avgProgress = hasDownloading
    ? downloading.reduce((sum, t) => sum + t.progress, 0) / downloading.length
    : 0;

  return (
    <TouchableOpacity onPress={onPress} style={styles.btn} activeOpacity={0.7}>
      {/* 进度环，绝对定位居中 */}
      {/* {hasDownloading && (
        <View style={styles.ringWrap} pointerEvents="none">
          <RingProgress progress={avgProgress} />
        </View>
      )} */}
      <Ionicons
        name="cloud-download-outline"
        size={22}
        color={hasDownloading ? BLUE : '#999'}
      />
    </TouchableOpacity>
  );
}

/**
 * 双半圆裁剪法绘制圆弧进度
 *
 * 两个「D 形」(实心半圆) 分别放在左/右裁剪容器中，
 * 旋转 D 形就能在容器内扫出弧形，配合白色内圆变成环形。
 *
 * 旋转轴 = D 形 View 的默认中心 = 外圆圆心，无需 transformOrigin。
 */
function RingProgress({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(1, progress));

  // 右半弧：进度 0→50%，右 D 从 -180°→0°（顺时针）
  const rightAngle = -180 + Math.min(p * 2, 1) * 180;
  // 左半弧：进度 50%→100%，左 D 从 180°→0°
  const leftAngle = 180 - Math.max(0, p * 2 - 1) * 180;

  return (
    <View style={styles.ring}>
      {/* 灰色背景环 */}
      <View style={styles.ringBg} />

      {/* ── 右裁剪：左边缘 = 圆心，只露右半 ── */}
      <View style={styles.rightClip}>
        {/* left: -SIZE/2 → D 形中心落在容器左边缘 = 外圆圆心 */}
        <View style={[styles.dRight, { transform: [{ rotate: `${rightAngle}deg` }] }]} />
      </View>

      {/* ── 左裁剪：右边缘 = 圆心，只露左半 ── */}
      <View style={styles.leftClip}>
        {/* left: 0 → D 形中心在容器右边缘 = 外圆圆心 */}
        <View style={[styles.dLeft, { transform: [{ rotate: `${leftAngle}deg` }] }]} />
      </View>

      {/* 白色内圆，把实心扇区变成环形 */}
      <View style={styles.inner} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: SIZE + 8,
    height: SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ececec',
  },
  // 绝对定位居中，overflow:hidden 防止 D 形溢出
  ringWrap: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: SIZE,
    height: SIZE,
    overflow: 'hidden',
  },
  ring: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBg: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: RING,
    borderColor: '#e0e0e0',
  },

  // 右裁剪容器：left = SIZE/2（圆心处），宽 SIZE/2，只露右半
  rightClip: {
    position: 'absolute',
    left: SIZE / 2,
    top: 0,
    width: SIZE / 2,
    height: SIZE,
    overflow: 'hidden',
  },
  // 右 D 形（右半圆）：left = -SIZE/2 → center = (0, SIZE/2) in clip = 外圆圆心
  dRight: {
    position: 'absolute',
    left: -SIZE / 2,
    top: 0,
    width: SIZE,
    height: SIZE,
    borderTopRightRadius: SIZE / 2,
    borderBottomRightRadius: SIZE / 2,
    backgroundColor: BLUE,
  },

  // 左裁剪容器：right = SIZE/2（圆心处），宽 SIZE/2，只露左半
  leftClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIZE / 2,
    height: SIZE,
    overflow: 'hidden',
  },
  // 左 D 形（左半圆）：left = 0 → center = (SIZE/2, SIZE/2) in clip = 外圆圆心
  dLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    borderTopLeftRadius: SIZE / 2,
    borderBottomLeftRadius: SIZE / 2,
    backgroundColor: BLUE,
  },

  // 白色内圆（遮住 D 形中心，留出环宽）
  inner: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    backgroundColor: '#fff',
  },
});
