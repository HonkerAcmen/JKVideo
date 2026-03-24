import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { VideoItem } from "../services/types";
import { formatCount, formatDuration } from "../utils/format";
import { coverImageUrl } from "../utils/imageUrl";
import { useSettingsStore } from "../store/settingsStore";

interface Props {
  item: VideoItem;
  onPress: () => void;
  width?: number;
}

export const VideoCard = React.memo(function VideoCard({
  item,
  onPress,
  width,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const coverQuality = useSettingsStore(s => s.coverQuality);
  const cardWidth = width ?? (windowWidth - 14) / 2;
  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.thumbContainer}>
        <Image
          source={{ uri: coverImageUrl(item.pic, coverQuality) }}
          style={[styles.thumb, { width: cardWidth, height: cardWidth * 0.5625 }]}
          resizeMode="cover"
        />
        <View style={styles.meta}>
          <Ionicons name="play" size={11} color="#fff" />
          <Text style={styles.metaText}>
            {formatCount(item.stat?.view ?? 0)}
          </Text>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      </View>
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
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 6,
    backgroundColor: "#fff",
    borderRadius: 6,
    overflow: "hidden",
  },
  thumbContainer: { position: "relative" },
  thumb: {
    backgroundColor: "#ddd",
  },
  durationBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    borderRadius: 5,
    paddingHorizontal: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 0,
  },
  durationText: { color: "#fff", fontSize: 10 },
  info: { padding: 6 },
  title: {
    fontSize: 12,
    color: "#212121",
    height: 33,
    marginBottom: 4,
  },
  owner: { fontSize: 11, color: "#999", marginTop: 2 },
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
  },
  metaText: { fontSize: 10, color: "#fff" },
});
