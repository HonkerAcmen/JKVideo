import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCheckUpdate } from '../hooks/useCheckUpdate';

export default function SettingsScreen() {
  const router = useRouter();
  const { isLoggedIn, logout } = useAuthStore();
  const { coverQuality, setCoverQuality } = useSettingsStore();
  const { currentVersion, isChecking, downloadProgress, checkUpdate } = useCheckUpdate();
  const handleBack = () => {
    if ((router as any).canGoBack?.()) {
      router.back();
    } else {
      router.replace("/" as any);
    }
  };

  const handleLogout = async () => {
    await logout();
    handleBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>设置</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>版本信息</Text>
        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>当前版本</Text>
          <Text style={styles.versionValue}>v{currentVersion}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>更新</Text>
        <TouchableOpacity
          style={styles.updateBtn}
          onPress={checkUpdate}
          activeOpacity={0.7}
          disabled={isChecking || downloadProgress !== null}
        >
          {isChecking ? (
            <>
              <ActivityIndicator size="small" color="#00AEEC" style={{ marginRight: 8 }} />
              <Text style={styles.updateBtnText}>检查中...</Text>
            </>
          ) : downloadProgress !== null ? (
            <Text style={styles.updateBtnText}>下载中 {downloadProgress}%</Text>
          ) : (
            <Text style={styles.updateBtnText}>检查更新</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>封面图清晰度</Text>
        <View style={styles.optionRow}>
          <TouchableOpacity
            style={[styles.option, coverQuality === 'hd' && styles.optionActive]}
            onPress={() => setCoverQuality('hd')}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionText, coverQuality === 'hd' && styles.optionTextActive]}>
              高清
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.option, coverQuality === 'normal' && styles.optionActive]}
            onPress={() => setCoverQuality('normal')}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionText, coverQuality === 'normal' && styles.optionTextActive]}>
              普通
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoggedIn && (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f4f4' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backBtn: { padding: 4, width: 32 },
  spacer: { width: 32 },
  topTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  sectionLabel: { fontSize: 13, color: '#999', marginBottom: 10 },
  optionRow: { flexDirection: 'row', gap: 10 },
  option: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  optionActive: { borderColor: '#00AEEC', backgroundColor: '#e8f7fd' },
  optionText: { fontSize: 14, color: '#666' },
  optionTextActive: { color: '#00AEEC', fontWeight: '600' },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionLabel: { fontSize: 14, color: '#212121' },
  versionValue: { fontSize: 14, color: '#999' },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  updateBtnText: { fontSize: 14, color: '#00AEEC', fontWeight: '600' },
  logoutBtn: {
    margin: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff4757',
    alignItems: 'center',
  },
  logoutText: { fontSize: 15, color: '#ff4757', fontWeight: '600' },
});
