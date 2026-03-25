import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { LoginModal } from "../components/LoginModal";

export default function MeScreen() {
  const router = useRouter();
  const { isLoggedIn, username, face } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);

  const handleBack = () => {
    if ((router as any).canGoBack?.()) router.back();
    else router.replace("/" as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>我的</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.profileCard}>
        {face ? (
          <Image source={{ uri: face }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={24} color="#888" />
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.nameText}>
            {isLoggedIn ? username || "已登录用户" : "未登录"}
          </Text>
          <Text style={styles.subText}>
            {isLoggedIn ? "管理你的收藏和关注" : "登录后可查看收藏夹和关注列表"}
          </Text>
        </View>
        {!isLoggedIn && (
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => setShowLogin(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.loginBtnText}>登录</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.entryRow}
          onPress={() =>
            isLoggedIn
              ? router.push("/favorites" as any)
              : setShowLogin(true)
          }
          activeOpacity={0.75}
        >
          <View style={styles.entryLeft}>
            <Ionicons name="bookmark-outline" size={18} color="#222" />
            <Text style={styles.entryText}>我的收藏夹</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.entryRow, styles.entryBorder]}
          onPress={() =>
            isLoggedIn
              ? router.push("/following" as any)
              : setShowLogin(true)
          }
          activeOpacity={0.75}
        >
          <View style={styles.entryLeft}>
            <Ionicons name="people-outline" size={18} color="#222" />
            <Text style={styles.entryText}>我的关注</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.entryRow, styles.entryBorder]}
          onPress={() => router.push("/settings" as any)}
          activeOpacity={0.75}
        >
          <View style={styles.entryLeft}>
            <Ionicons name="settings-outline" size={18} color="#222" />
            <Text style={styles.entryText}>设置</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>

      <LoginModal visible={showLogin} onClose={() => setShowLogin(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f5" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  backBtn: { padding: 4, width: 32 },
  spacer: { width: 32 },
  topTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
    textAlign: "center",
  },
  profileCard: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#eee" },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ececec",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  nameText: { fontSize: 16, color: "#222", fontWeight: "600" },
  subText: { marginTop: 4, fontSize: 12, color: "#888" },
  loginBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#111",
  },
  loginBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  section: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  entryRow: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  entryBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ececec",
  },
  entryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  entryText: { fontSize: 14, color: "#222" },
});

