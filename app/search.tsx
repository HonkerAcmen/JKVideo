import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VideoCard } from '../components/VideoCard';
import { useSearch } from '../hooks/useSearch';
import type { VideoItem } from '../services/types';

export default function SearchScreen() {
  const router = useRouter();
  const { keyword, setKeyword, results, loading, hasMore, search, loadMore } = useSearch();
  const inputRef = useRef<TextInput>(null);
  const handleBack = () => {
    if ((router as any).canGoBack?.()) {
      router.back();
    } else {
      router.replace("/" as any);
    }
  };

  const handleSearch = useCallback(() => {
    if (keyword.trim()) {
      search(keyword, true);
    }
  }, [keyword, search]);

  const renderItem = useCallback(
    ({ item, index }: { item: VideoItem; index: number }) => {
      if (index % 2 !== 0) return null;
      const right = results[index + 1];
      return (
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <VideoCard
              item={item}
              onPress={() => router.push(`/video/${item.bvid}` as any)}
            />
          </View>
          {right ? (
            <View style={styles.rightCol}>
              <VideoCard
                item={right}
                onPress={() => router.push(`/video/${right.bvid}` as any)}
              />
            </View>
          ) : (
            <View style={styles.rightCol} />
          )}
        </View>
      );
    },
    [results, router],
  );

  const keyExtractor = useCallback(
    (_: VideoItem, index: number) => String(index),
    [],
  );

  const ListEmptyComponent = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="search-outline" size={48} color="#ddd" />
        <Text style={styles.emptyText}>
          {results.length === 0 && keyword.trim()
            ? '没有找到相关视频'
            : '输入关键词搜索'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Search header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#212121" />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="搜索视频、UP主..."
            placeholderTextColor="#999"
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => setKeyword('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color="#bbb" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={<ListEmptyComponent />}
        ListFooterComponent={
          loading && results.length > 0 ? (
            <View style={styles.footer}>
              <ActivityIndicator color="#00AEEC" />
            </View>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f4f4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 6,
  },
  backBtn: { padding: 4 },
  inputWrap: {
    flex: 1,
    height: 34,
    backgroundColor: '#f0f0f0',
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
    padding: 0,
  },
  clearBtn: { paddingLeft: 4 },
  searchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchBtnText: { fontSize: 14, color: '#00AEEC', fontWeight: '600' },
  listContent: { paddingTop: 6, paddingBottom: 20 },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 1,
    justifyContent: 'flex-start',
  },
  leftCol: { flex: 1, marginLeft: 4, marginRight: 2 },
  rightCol: { flex: 1, marginLeft: 2, marginRight: 4 },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: '#bbb' },
  footer: { height: 48, alignItems: 'center', justifyContent: 'center' },
});
