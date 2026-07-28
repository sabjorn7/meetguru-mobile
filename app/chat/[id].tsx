import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConversation, type DisplayMessage } from '@/features/chats/useConversation';

const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

function formatTime(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '' : timeFormatter.format(parsed);
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const mine = message.mine;
  return (
    <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.text}</Text>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
            {formatTime(message.createdAt)}
          </Text>
          {mine && message.status === 'sending' ? (
            <Text style={styles.bubbleStatus}>отправка…</Text>
          ) : null}
          {mine && message.status === 'failed' ? (
            <Text style={styles.bubbleFailed}>не отправлено</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const { messages, loading, error, send } = useConversation(id);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');

  // Inverted list renders newest at the bottom and pins to it automatically.
  const inverted = useMemo(() => [...messages].reverse(), [messages]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    send(text);
    setDraft('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ title: title || 'Диалог' }} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={inverted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          inverted
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyInverted}>
              <Text style={styles.muted}>Сообщений пока нет</Text>
            </View>
          }
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom || 8 }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Сообщение…"
          placeholderTextColor="#9ca3af"
          multiline
        />
        <Pressable
          style={[styles.sendButton, !draft.trim() && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!draft.trim()}
        >
          <Text style={styles.sendText}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyInverted: {
    alignItems: 'center',
    paddingVertical: 40,
    transform: [{ scaleY: -1 }],
  },
  bubbleRow: {
    marginVertical: 3,
    flexDirection: 'row',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#f1f3f5',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#111827',
  },
  bubbleTextMine: {
    color: '#fff',
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 2,
  },
  bubbleTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  bubbleTimeMine: {
    color: '#c7dbff',
  },
  bubbleStatus: {
    fontSize: 11,
    color: '#c7dbff',
  },
  bubbleFailed: {
    fontSize: 11,
    color: '#fecaca',
  },
  muted: {
    fontSize: 15,
    color: '#6b7280',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 15,
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#fff',
    fontSize: 18,
  },
});
