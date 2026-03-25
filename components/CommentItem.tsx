import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Comment } from '../services/types';
import { formatTime } from '../utils/format';
import { proxyImageUrl } from '../utils/imageUrl';

interface Props {
  item: Comment;
  liked?: boolean;
  likeCount?: number;
  likeLoading?: boolean;
  onLikePress?: (item: Comment) => void;
}

export function CommentItem({
  item,
  liked = false,
  likeCount,
  likeLoading = false,
  onLikePress,
}: Props) {
  const count = likeCount ?? item.like ?? 0;
  return (
    <View style={styles.row}>
      <Image source={{ uri: proxyImageUrl(item.member.avatar) }} style={styles.avatar} />
      <View style={styles.content}>
        <Text style={styles.username}>{item.member.uname}</Text>
        <Text style={styles.message}>{item.content.message}</Text>
        <View style={styles.footer}>
          <Text style={styles.time}>{formatTime(item.ctime)}</Text>
          <TouchableOpacity
            style={styles.likeRow}
            onPress={() => onLikePress?.(item)}
            disabled={likeLoading}
            activeOpacity={0.8}
          >
            <Ionicons
              name={liked ? "thumbs-up" : "thumbs-up-outline"}
              size={14}
              color={liked ? "#111" : "#666"}
            />
            <Text style={[styles.likeLabel, liked && styles.likeLabelActive]}>
              点赞
            </Text>
            <Text style={[styles.likeCount, liked && styles.likeCountActive]}>
              {count > 0 ? count : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6e6'
  },
  avatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  content: { flex: 1 },
  username: { fontSize: 12, color: '#1f1f1f', marginBottom: 4, fontWeight: '600' },
  message: { fontSize: 14, color: '#232323', lineHeight: 21 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  time: { fontSize: 11, color: '#9b9b9b' },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 62, justifyContent: "flex-end" },
  likeLabel: { fontSize: 11, color: "#7a7a7a" },
  likeLabelActive: { color: "#111", fontWeight: "600" },
  likeCount: { fontSize: 11, color: '#8a8a8a' },
  likeCountActive: { color: "#111", fontWeight: "600" },
});
