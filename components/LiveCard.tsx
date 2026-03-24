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
import { LivePulse } from "./LivePulse";
import type { LiveRoom } from "../services/types";
import { formatCount } from "../utils/format";
import { proxyImageUrl } from "../utils/imageUrl";

interface Props {
  item: LiveRoom;
  isLivePulse?: Boolean;
  onPress?: () => void;
  fullWidth?: boolean;
  width?: number;
}

export const LiveCard = React.memo(function LiveCard({
  item,
  onPress,
  fullWidth,
  width,
  isLivePulse = false,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = width ?? (fullWidth ? windowWidth - 8 : (windowWidth - 14) / 2);
  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.thumbContainer}>
        <Image
          source={{ uri: proxyImageUrl(item.cover) }}
          style={[
            styles.thumb,
            { width: cardWidth, height: cardWidth * 0.5625 },
          ]}
          resizeMode="cover"
        />
        <View style={styles.liveBadge}>
          {isLivePulse && <LivePulse />}
          <Text style={styles.liveBadgeText}>直播中</Text>
        </View>
        <View style={styles.meta}>
          <Ionicons name="people" size={11} color="#fff" />
          <Text style={styles.metaText}>{formatCount(item.online)}</Text>
        </View>
        <View style={styles.areaBadge}>
          <Text style={styles.areaText}>{item.area_name}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.ownerRow}>
          <Image
            source={{ uri: proxyImageUrl(item.face) }}
            style={styles.avatar}
          />
          <Text style={styles.owner} numberOfLines={1}>
            {item.uname}
          </Text>
        </View>
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
  liveBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  liveBadgeText: { color: "#fff", fontSize: 10, fontWeight: "400" },
  meta: {
    position: "absolute",
    bottom: 4,
    left: 4,
    paddingHorizontal: 4,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  metaText: { fontSize: 10, color: "#fff" },
  areaBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    borderRadius: 5,
    paddingHorizontal: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  areaText: { color: "#fff", fontSize: 10 },
  info: { padding: 6 },
  title: {
    fontSize: 12,
    color: "#212121",
    height: 33,
    marginBottom: 4,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  owner: { fontSize: 11, color: "#999", flex: 1 },
});
