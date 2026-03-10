import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { DanmakuItem } from '../services/types';
import { danmakuColorToCss } from '../utils/danmaku';

interface Props {
  danmakus: DanmakuItem[];
  currentTime: number;
  screenWidth: number;
  screenHeight: number;
  visible: boolean;
}

const LANE_COUNT = 5;
const LANE_H = 28;

interface ActiveDanmaku {
  id: string;
  item: DanmakuItem;
  lane: number;
  tx: Animated.Value;
  opacity: Animated.Value;
}

export default function DanmakuOverlay({ danmakus, currentTime, screenWidth, screenHeight, visible }: Props) {
  const [activeDanmakus, setActiveDanmakus] = useState<ActiveDanmaku[]>([]);
  const laneAvailAt = useRef<number[]>(new Array(LANE_COUNT).fill(0));
  const activated = useRef<Set<string>>(new Set());
  const prevTimeRef = useRef<number>(currentTime);
  const idCounter = useRef(0);

  const pickLane = useCallback((): number | null => {
    const now = Date.now();
    for (let i = 0; i < LANE_COUNT; i++) {
      if (laneAvailAt.current[i] <= now) return i;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!visible) return;

    const prevTime = prevTimeRef.current;
    const didSeek = Math.abs(currentTime - prevTime) > 2;
    prevTimeRef.current = currentTime;

    if (didSeek) {
      // Clear on seek
      activated.current.clear();
      laneAvailAt.current.fill(0);
      setActiveDanmakus([]);
      return;
    }

    // Find danmakus in the activation window
    const window = 0.4;
    const candidates = danmakus.filter(d => {
      const key = `${d.time}_${d.text}`;
      return d.time >= currentTime - window && d.time <= currentTime + window && !activated.current.has(key);
    });

    if (candidates.length === 0) return;

    const newItems: ActiveDanmaku[] = [];

    for (const item of candidates) {
      const key = `${item.time}_${item.text}`;
      if (activated.current.size > 200) activated.current.clear(); // prevent memory leak
      activated.current.add(key);

      if (item.mode === 1) {
        // Scrolling danmaku
        const lane = pickLane();
        if (lane === null) continue; // drop if all lanes full

        const charWidth = Math.min(item.fontSize, 22) * 0.8;
        const textWidth = item.text.length * charWidth;
        const duration = 8000;
        // Lane becomes available when tail of this danmaku clears the right edge of screen
        // tail starts at screenWidth, text has width textWidth
        // tail clears left edge at duration ms
        // lane available when head of next can start without overlapping: when tail clears screen right = immediately for next (head starts at screenWidth)
        // conservative: lane free after textWidth / (2*screenWidth) * duration ms
        const laneDelay = (textWidth / (screenWidth + textWidth)) * duration;
        laneAvailAt.current[lane] = Date.now() + laneDelay;

        const tx = new Animated.Value(screenWidth);
        const id = `d_${idCounter.current++}`;

        newItems.push({ id, item, lane, tx, opacity: new Animated.Value(1) });

        Animated.timing(tx, {
          toValue: -textWidth - 20,
          duration,
          useNativeDriver: true,
        }).start(() => {
          setActiveDanmakus(prev => prev.filter(d => d.id !== id));
        });
      } else {
        // Fixed danmaku (mode 4 = bottom, mode 5 = top)
        const opacity = new Animated.Value(1);
        const id = `d_${idCounter.current++}`;
        newItems.push({ id, item, lane: -1, tx: new Animated.Value(0), opacity });

        Animated.sequence([
          Animated.delay(2000),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start(() => {
          setActiveDanmakus(prev => prev.filter(d => d.id !== id));
        });
      }
    }

    if (newItems.length > 0) {
      setActiveDanmakus(prev => {
        const combined = [...prev, ...newItems];
        // Cap at 30 simultaneous danmakus
        return combined.slice(Math.max(0, combined.length - 30));
      });
    }
  }, [currentTime, visible, danmakus, pickLane, screenWidth]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {activeDanmakus.map(d => {
        const fontSize = Math.min(d.item.fontSize || 25, 22);
        const isScrolling = d.item.mode === 1;
        const isTop = d.item.mode === 5;

        return (
          <Animated.Text
            key={d.id}
            style={{
              position: 'absolute',
              top: isScrolling
                ? 20 + d.lane * LANE_H
                : isTop
                ? 20
                : screenHeight - 48,
              left: isScrolling ? 0 : undefined,
              alignSelf: !isScrolling ? 'center' : undefined,
              transform: isScrolling ? [{ translateX: d.tx }] : [],
              opacity: d.opacity,
              color: danmakuColorToCss(d.item.color),
              fontSize,
              fontWeight: '700',
              textShadowColor: 'rgba(0,0,0,0.8)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {d.item.text}
          </Animated.Text>
        );
      })}
    </View>
  );
}
