import { Image, StyleSheet, Text, View } from 'react-native';

import type { ArticleComment } from './api';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '' : dateFormatter.format(parsed);
}

function initial(name: string | null): string {
  return name?.trim()?.[0]?.toUpperCase() ?? '?';
}

export function ArticleComments({ comments }: { comments: ArticleComment[] }) {
  return (
    <View style={styles.list}>
      {comments.map((comment) => (
        <View key={comment.id} style={styles.comment}>
          {comment.authorPhoto ? (
            <Image source={{ uri: comment.authorPhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{initial(comment.authorName)}</Text>
            </View>
          )}
          <View style={styles.body}>
            <View style={styles.header}>
              <Text style={styles.name}>{comment.authorName ?? 'Пользователь'}</Text>
              <Text style={styles.date}>{formatDate(comment.created_at)}</Text>
            </View>
            <Text style={styles.text}>{comment.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 16,
  },
  comment: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6b7280',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
});
