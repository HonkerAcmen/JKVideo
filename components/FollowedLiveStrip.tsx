import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/authStore";
import { getFollowedLiveRooms } from "../services/bilibili";
import { LivePulse } from "./LivePulse";
import { proxyImageUrl } from "../utils/imageUrl";
import type { LiveRoom } from "../services/types";

export function FollowedLiveStrip() {
  const { sessdata } = useAuthStore();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!sessdata) return;
    getFollowedLiveRooms()
      .then(setRooms)
      .catch(() => {});
  }, [sessdata]);

  if (!sessdata || rooms.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {rooms.map((room, index) => (
          <TouchableOpacity
            key={`followed-${room.roomid ?? index}`}
            style={styles.item}
            onPress={() => router.push(`/live/${room.roomid}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.pulseRow}>
              <LivePulse />
              <Text style={{ color: "#fff", fontSize: 9,marginLeft:2 }}>直播</Text>
            </View>
            <Image
              source={{ uri: proxyImageUrl(room.face) }}
              style={styles.avatar}
            />
            <Text style={styles.name} numberOfLines={1}>
              {room.uname.length > 5 ? room.uname.slice(0, 5) : room.uname}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  scrollContent: {
    gap: 12,
    alignItems: "center",
  },
  item: {
    alignItems: "center",
    width: 60,
    position: "relative",
  },
  pulseRow: {
    position: "absolute",
    backgroundColor: "rgba(17,17,17,0.86)",
    bottom: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    zIndex: 100,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eee",
  },
  name: {
    fontSize: 11,
    color: "#333",
    marginTop: 6,
    textAlign: "center",
    width: 60,
  },
});
