import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Alert,
  Linking,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import { generateQRCode, pollQRCode, getUserInfo } from "../services/bilibili";
import { useAuthStore } from "../store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LoginModal({ visible, onClose }: Props) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrKey, setQrKey] = useState<string | null>(null);
  const [qrImageLoaded, setQrImageLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<
    "loading" | "waiting" | "scanned" | "done" | "error"
  >("loading");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const login = useAuthStore((s) => s.login);
  const setProfile = useAuthStore((s) => s.setProfile);

  // sheet 滑入动画
  const slideY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      slideY.setValue(300);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setStatus("loading");
    setQrUrl(null);
    setQrKey(null);
    setQrImageLoaded(false);
    generateQRCode()
      .then((data) => {
        setQrUrl(
          `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data.url)}&size=400x400`,
        );
        setQrKey(data.qrcode_key);
        setStatus("waiting");
      })
      .catch(() => setStatus("error"));

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [visible]);

  useEffect(() => {
    if (!qrKey || status !== "waiting") return;
    pollRef.current = setInterval(async () => {
      const result = await pollQRCode(qrKey);
      if (result.code === 86038) {
        setStatus("error");
        clearInterval(pollRef.current!);
      }
      if (result.code === 86090) setStatus("scanned");
      if (result.code === 0 && result.cookie) {
        clearInterval(pollRef.current!);
        try {
          if (result.uid) await AsyncStorage.setItem("UID", result.uid);
          if (result.uidCkmd5) {
            await AsyncStorage.setItem("UID_CKMD5", result.uidCkmd5);
          }
          if (result.sid) await AsyncStorage.setItem("SID", result.sid);
          await login(result.cookie, result.uid ?? "", "", result.csrf);
          setStatus("done");
          const info = await getUserInfo();
          setProfile(info.face, info.uname, String(info.mid));
        } catch {
          setStatus("error");
        }
        onClose();
      }
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [qrKey, status]);

  async function handleSaveQR() {
    if (!qrUrl) return;
    setSaving(true);
    try {
      const { status: perm } = await MediaLibrary.requestPermissionsAsync();
      if (perm !== "granted") {
        Alert.alert("提示", "需要相册权限才能保存图片");
        return;
      }
      const dest = `${FileSystem.cacheDirectory}bilibili_qr.png`;
      const { uri } = await FileSystem.downloadAsync(qrUrl, dest);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("已保存", "二维码已存入相册，请用哔哩哔哩扫码登录", [
        { text: "关闭", style: "cancel" },
        {
          text: "打开哔哩哔哩",
          onPress: () => Linking.openURL("bilibili://"),
        },
      ]);
    } catch {
      Alert.alert("失败", "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* 遮罩固定不动 */}
      <View style={styles.overlay} pointerEvents="box-none" />

      {/* sheet 独立滑入 */}
      <Animated.View
        style={[styles.sheetWrapper, { transform: [{ translateY: slideY }] }]}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>扫码登录</Text>
          {status === "loading" && (
            <ActivityIndicator
              size="large"
              color="#00AEEC"
              style={styles.loader}
            />
          )}
          {(status === "waiting" || status === "scanned") && qrUrl && (
            <>
              <View style={styles.qrWrapper}>
                <Image
                  source={{ uri: qrUrl }}
                  style={styles.qr}
                  onLoad={() => setQrImageLoaded(true)}
                />
                {!qrImageLoaded && (
                  <View style={styles.qrLoader}>
                    <ActivityIndicator size="large" color="#00AEEC" />
                  </View>
                )}
                {qrImageLoaded && (
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveQR}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="download-outline" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.hint}>
                {status === "scanned"
                  ? "扫描成功，请在手机确认"
                  : "使用 B站 APP 扫一扫"}
              </Text>
            </>
          )}
          {status === "error" && (
            <Text style={styles.hint}>二维码已过期，请关闭重试</Text>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>关闭</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 20 },
  loader: { marginVertical: 40 },
  qrWrapper: { width: 200, height: 200, marginBottom: 12 },
  qr: { width: 200, height: 200 },
  qrLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f4f4",
  },
  saveBtn: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 13, color: "#666", marginBottom: 20 },
  closeBtn: { padding: 12 },
  closeTxt: { fontSize: 14, color: "#00AEEC" },
});
