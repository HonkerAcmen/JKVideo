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
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ececec",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  thumbContainer: { position: "relative" },
  thumb: {
    backgroundColor: "#ddd",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    borderRadius: 999,
    paddingHorizontal: 7,
    backgroundColor: "rgba(17,17,17,0.86)",
    paddingVertical: 2,
  },
  durationText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  info: { padding: 10 },
  title: {
    fontSize: 13,
    color: "#171717",
    height: 38,
    marginBottom: 5,
    lineHeight: 19,
    fontWeight: "500",
  },
  owner: { fontSize: 11, color: "#7e7e7e", marginTop: 2 },
  meta: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: "rgba(17,17,17,0.86)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    gap: 3,
  },
  metaText: { fontSize: 10, color: "#fff", fontWeight: "600" },
});
