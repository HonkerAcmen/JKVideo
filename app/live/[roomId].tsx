import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLiveDetail } from "../../hooks/useLiveDetail";
import { useLiveDanmaku } from "../../hooks/useLiveDanmaku";
import { LivePlayer } from "../../components/LivePlayer";
import DanmakuList from "../../components/DanmakuList";
import { formatCount } from "../../utils/format";
import { proxyImageUrl } from "../../utils/imageUrl";

type Tab = "intro" | "danmaku";

export default function LiveDetailScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const id = parseInt(roomId ?? "0", 10);
  const { room, anchor, stream, loading, error, changeQuality } =
    useLiveDetail(id);
  const [tab, setTab] = useState<Tab>("intro");

  const isLive = room?.live_status === 1;
  const hlsUrl = stream?.hlsUrl ?? "";
  const flvUrl = stream?.flvUrl ?? "";
  const qualities = stream?.qualities ?? [];
  const currentQn = stream?.qn ?? 0;

  // Use actual roomid from room detail (not the short/alias ID from the URL)
  const actualRoomId = room?.roomid ?? id;
  const { danmakus, giftCounts } = useLiveDanmaku(isLive ? actualRoomId : 0);
  const handleBack = () => {
    if ((router as any).canGoBack?.()) {
      router.back();
    } else {
      router.replace("/" as any);
    }
  };
  return (
    <SafeAreaView style={styles.safe}>
      {/* TopBar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {room?.title ?? "直播间"}
        </Text>
      </View>

      {/* Player */}
      <LivePlayer
        hlsUrl={hlsUrl}
        flvUrl={flvUrl}
        isLive={isLive}
        qualities={qualities}
        currentQn={currentQn}
        onQualityChange={changeQuality}
      />

      {/* TabBar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setTab("intro")}
        >
          <Text style={[styles.tabLabel, tab === "intro" && styles.tabActive]}>
            简介
          </Text>
          {tab === "intro" && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setTab("danmaku")}
        >
          <Text
            style={[styles.tabLabel, tab === "danmaku" && styles.tabActive]}
          >
            弹幕{danmakus.length > 0 ? ` ${danmakus.length}` : ""}
          </Text>
          {tab === "danmaku" && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {/* Content — 两个面板始终挂载，通过 display 切换，保留弹幕列表状态 */}
      {loading ? (
        <ActivityIndicator style={styles.loader} color="#00AEEC" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          <ScrollView
            style={[styles.scroll, tab !== "intro" && styles.hidden]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleSection}>
              <Text style={styles.title}>{room?.title}</Text>
              <View style={styles.metaRow}>
                {isLive ? (
                  <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.livePillText}>直播中</Text>
                  </View>
                ) : (
                  <View style={[styles.livePill, styles.offlinePill]}>
                    <Text style={[styles.livePillText, styles.offlinePillText]}>
                      未开播
                    </Text>
                  </View>
                )}
                <View style={styles.onlineRow}>
                  <Ionicons name="eye-outline" size={13} color="#999" />
                  <Text style={styles.onlineText}>
                    {formatCount(room?.online ?? 0)}
                  </Text>
                </View>
              </View>
              <View style={styles.areaRow}>
                {room?.parent_area_name ? (
                  <Text style={styles.areaTag}>{room.parent_area_name}</Text>
                ) : null}
                {room?.area_name ? (
                  <Text style={styles.areaTag}>{room.area_name}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.divider} />

            {anchor && (
              <View style={styles.anchorRow}>
                <Image
                  source={{ uri: proxyImageUrl(anchor.face) }}
                  style={styles.avatar}
                />
                <Text style={styles.anchorName}>{anchor.uname}</Text>
                <TouchableOpacity style={styles.followBtn}>
                  <Text style={styles.followTxt}>+ 关注</Text>
                </TouchableOpacity>
              </View>
            )}

            {!!room?.description && (
              <View style={styles.descBox}>
                <Text style={styles.descText}>{room.description}</Text>
              </View>
            )}
          </ScrollView>

          <DanmakuList
            danmakus={danmakus}
            currentTime={999999}
            visible
            onToggle={() => {}}
            style={[styles.danmakuFull, tab !== "danmaku" && styles.hidden]}
            hideHeader
            isLive
            maxItems={500}
            giftCounts={giftCounts}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  backBtn: { padding: 4 },
  topTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 4,
    color: "#212121",
  },
  loader: { marginVertical: 30 },
  errorText: { textAlign: "center", color: "#f00", padding: 20 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  tabItem: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    position: "relative",
  },
  tabLabel: { fontSize: 14, color: "#999", fontWeight: "500" },
  tabActive: { color: "#00AEEC", fontWeight: "700" },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    width: 24,
    height: 2,
    backgroundColor: "#00AEEC",
    borderRadius: 2,
  },
  scroll: { flex: 1 },
  titleSection: { padding: 14 },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
    lineHeight: 22,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff0f0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  offlinePill: { backgroundColor: "#f5f5f5" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#f00" },
  livePillText: { fontSize: 12, color: "#f00", fontWeight: "600" },
  offlinePillText: { color: "#999" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  onlineText: { fontSize: 12, color: "#999" },
  areaRow: { flexDirection: "row", gap: 6 },
  areaTag: {
    fontSize: 11,
    color: "#00AEEC",
    backgroundColor: "#e8f7fd",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 14,
  },
  anchorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  anchorName: { flex: 1, fontSize: 14, color: "#212121", fontWeight: "500" },
  followBtn: {
    backgroundColor: "#00AEEC",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  followTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
  descBox: { padding: 14, paddingTop: 4 },
  descText: { fontSize: 14, color: "#555", lineHeight: 22 },
  danmakuFull: { flex: 1 },
  hidden: { display: "none" },
});
