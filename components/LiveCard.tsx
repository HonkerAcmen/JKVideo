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
  liveBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(17,17,17,0.86)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveBadgeText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  meta: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: "rgba(17,17,17,0.86)",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
  },
  metaText: { fontSize: 10, color: "#fff", fontWeight: "600" },
  areaBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    borderRadius: 999,
    paddingHorizontal: 7,
    backgroundColor: "rgba(17,17,17,0.86)",
    paddingVertical: 2,
  },
  areaText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  info: { padding: 10 },
  title: {
    fontSize: 13,
    color: "#171717",
    height: 38,
    marginBottom: 5,
    lineHeight: 19,
    fontWeight: "500",
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#eee",
  },
  owner: { fontSize: 11, color: "#7e7e7e", flex: 1 },
});
