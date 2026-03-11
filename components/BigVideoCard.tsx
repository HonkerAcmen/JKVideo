// components/BigVideoCard.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Dimensions, Animated,
} from 'react-native';
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import { buildDashMpdUri } from '../utils/dash';
import { getPlayUrl, getVideoDetail } from '../services/bilibili';
import { proxyImageUrl } from '../utils/imageUrl';
import { formatCount, formatDuration } from '../utils/format';
import type { VideoItem } from '../services/types';
import { useRouter } from 'expo-router';

const { width: SCREEN_W } = Dimensions.get('window');
const THUMB_H = SCREEN_W * 0.5625; // 16:9

const HEADERS = {
  Referer: 'https://www.bilibili.com',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

interface Props {
  item: VideoItem;
  isVisible: boolean;
  onPress: () => void;
}

export function BigVideoCard({ item, isVisible, onPress }: Props) {
  const [videoUrl, setVideoUrl] = useState<string | undefined>();
  const [isDash, setIsDash] = useState(false);
  const [paused, setPaused] = useState(true);
  const thumbOpacity = useRef(new Animated.Value(1)).current;

  // Fetch play URL when visible for the first time
  useEffect(() => {
    if (!isVisible || videoUrl) return;

    (async () => {
      try {
        // cid may be missing from feed items; fetch detail if needed
        let cid = item.cid;
        if (!cid) {
          const detail = await getVideoDetail(item.bvid);
          cid = detail.cid ?? detail.pages?.[0]?.cid;
        }
        if (!cid) return;

        const playData = await getPlayUrl(item.bvid, cid, 16);

        if (playData.dash) {
          setIsDash(true);
          try {
            const mpdUri = await buildDashMpdUri(playData, 16);
            setVideoUrl(mpdUri);
          } catch {
            setVideoUrl(playData.dash.video[0]?.baseUrl);
          }
        } else {
          setVideoUrl(playData.durl?.[0]?.url);
        }
      } catch (e) {
        console.warn('BigVideoCard: failed to load play URL', e);
      }
    })();
  }, [isVisible]);

  // Pause/resume when visibility changes
  useEffect(() => {
    if (!videoUrl) return;
    setPaused(!isVisible);
    if (!isVisible) {
      // Restore thumbnail when leaving viewport
      Animated.timing(thumbOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [isVisible, videoUrl]);

  const handleVideoReady = () => {
    setPaused(false);
    Animated.timing(thumbOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Media area */}
      <View style={styles.mediaContainer}>
        {/* Thumbnail */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: thumbOpacity }]}>
          <Image
            source={{ uri: proxyImageUrl(item.pic) }}
            style={styles.thumb}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Duration badge on thumbnail */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>

        {/* Video player — only mounted when URL is available */}
        {videoUrl && (
          <Video
            source={
              isDash
                ? { uri: videoUrl, type: 'mpd', headers: HEADERS }
                : { uri: videoUrl, headers: HEADERS }
            }
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            muted
            paused={paused}
            repeat
            controls={false}
            onReadyForDisplay={handleVideoReady}
          />
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <View style={styles.meta}>
          <Ionicons name="play" size={11} color="#999" />
          <Text style={styles.metaText}>{formatCount(item.stat?.view ?? 0)}</Text>
        </View>
        <Text style={styles.owner} numberOfLines={1}>{item.owner?.name ?? ''}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 4,
    marginBottom: 6,
    backgroundColor: '#fff',
    borderRadius: 6,
    overflow: 'hidden',
  },
  mediaContainer: {
    width: SCREEN_W - 8,
    height: THUMB_H,
  },
  thumb: {
    width: SCREEN_W - 8,
    height: THUMB_H,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 2,
  },
  durationText: { color: '#fff', fontSize: 10 },
  info: { padding: 8 },
  title: { fontSize: 14, color: '#212121', lineHeight: 18, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText: { fontSize: 11, color: '#999' },
  owner: { fontSize: 11, color: '#999', marginTop: 2 },
});
