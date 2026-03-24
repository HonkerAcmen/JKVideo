import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Video from 'react-native-video';
let ScreenOrientation: typeof import('expo-screen-orientation') | null = null;
try { ScreenOrientation = require('expo-screen-orientation'); } catch {}
import { useDownloadStore, DownloadTask } from '../store/downloadStore';
import { LanShareModal } from '../components/LanShareModal';

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
import { proxyImageUrl } from '../utils/imageUrl';

export default function DownloadsScreen() {
  const router = useRouter();
  const { tasks, loadFromStorage, removeTask } = useDownloadStore();
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [playingTitle, setPlayingTitle] = useState('');
  const [shareTask, setShareTask] = useState<(DownloadTask & { key: string }) | null>(null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const handleBack = () => {
    if ((router as any).canGoBack?.()) {
      router.back();
    } else {
      router.replace("/" as any);
    }
  };

  async function openPlayer(uri: string, title: string) {
    setPlayingTitle(title);
    setPlayingUri(uri);
    await ScreenOrientation?.unlockAsync();
  }

  async function closePlayer() {
    setPlayingUri(null);
    await ScreenOrientation?.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }

  useEffect(() => {
    loadFromStorage();
  }, []);

  const all = Object.entries(tasks).map(([key, task]) => ({ key, ...task }));
  const downloading = all.filter((t) => t.status === 'downloading' || t.status === 'error');
  const done = all.filter((t) => t.status === 'done');

  const sections = [];
  if (downloading.length > 0) sections.push({ title: '下载中', data: downloading });
  if (done.length > 0) sections.push({ title: '已下载', data: done });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>我的下载</Text>
        <View style={{ width: 32 }} />
      </View>

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cloud-download-outline" size={56} color="#ccc" />
          <Text style={styles.emptyTxt}>暂无下载记录</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.key}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <DownloadRow
              task={item}
              onPlay={() => {
                if (item.localUri) openPlayer(item.localUri, item.title);
              }}
              onDelete={() => removeTask(item.key)}
              onShare={() => setShareTask(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}

      <LanShareModal
        visible={!!shareTask}
        task={shareTask}
        onClose={() => setShareTask(null)}
      />

      {/* Local file player modal */}
      <Modal
        visible={!!playingUri}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closePlayer}
      >
        <StatusBar hidden />
        <View style={styles.playerBg}>
          {playingUri && (
            <Video
              source={{ uri: playingUri }}
              style={isLandscape
                ? { width, height }
                : { width, height: width * 0.5625 }}
              resizeMode="contain"
              controls
              paused={false}
            />
          )}
          {!isLandscape && (
            <View style={styles.playerBar}>
              <TouchableOpacity onPress={closePlayer} style={styles.closeBtn}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.playerTitle} numberOfLines={1}>{playingTitle}</Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DownloadRow({
  task,
  onPlay,
  onDelete,
  onShare,
}: {
  task: DownloadTask & { key: string };
  onPlay: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  return (
    <View style={styles.row}>
      <Image
        source={{ uri: proxyImageUrl(task.cover) }}
        style={styles.cover}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{task.title}</Text>
        <Text style={styles.qdesc}>
          {task.qdesc}{task.fileSize ? `  ·  ${formatFileSize(task.fileSize)}` : ''}
        </Text>
        {task.status === 'downloading' && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(task.progress * 100)}%` as any }]} />
            </View>
            <ActivityIndicator size="small" color="#00AEEC" style={{ marginLeft: 6 }} />
            <Text style={styles.progressTxt}>{Math.round(task.progress * 100)}%</Text>
          </View>
        )}
        {task.status === 'error' && (
          <Text style={styles.errorTxt} numberOfLines={1}>{task.error ?? '下载失败'}</Text>
        )}
      </View>
      <View style={styles.actions}>
        {task.status === 'done' && (
          <>
            <TouchableOpacity style={styles.playBtn} onPress={onPlay}>
              <Ionicons name="play-circle" size={20} color="#00AEEC" />
              <Text style={styles.playTxt}>播放</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
              <Ionicons name="share-social-outline" size={20} color="#00AEEC" />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color="#bbb" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backBtn: { padding: 4 },
  topTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginLeft: 4,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTxt: { fontSize: 14, color: '#bbb' },
  sectionHeader: {
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#555' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 12,
  },
  cover: { width: 80, height: 54, borderRadius: 6, backgroundColor: '#eee' },
  info: { flex: 1 },
  title: { fontSize: 13, color: '#212121', lineHeight: 18, marginBottom: 4 },
  qdesc: { fontSize: 12, color: '#999', marginBottom: 4 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  progressFill: { height: 3, backgroundColor: '#00AEEC', borderRadius: 2 },
  progressTxt: { fontSize: 11, color: '#999', marginLeft: 4 },
  errorTxt: { fontSize: 12, color: '#f44', marginTop: 2 },
  actions: { alignItems: 'center', gap: 8 },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  playTxt: { fontSize: 13, color: '#00AEEC' },
  shareBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#f0f0f0', marginLeft: 108 },
  // player modal
  playerBg: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  playerBar: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  closeBtn: { padding: 6 },
  playerTitle: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 4 },
});
