import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';

import { colors, themedStyles } from '@/components/theme';
import { EmptyState } from '@/components/ui';
import { useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { clock, formatDate, toDateStr } from '@/lib/utils';

export default function ChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, user, sendMessage, markThreadRead } = useStore();
  const [text, setText] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);
  const peer = data.users.find((u) => u.id === id);

  const thread = data.messages
    .filter((m) => (m.from === user?.id && m.to === id) || (m.from === id && m.to === user?.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  useEffect(() => {
    markThreadRead(id);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.length]);

  if (!peer || !user) return <EmptyState text={t('Conversation not found')} />;

  const subtitle = peer.role === 'teacher'
    ? `${t(peer.subject ?? '')} ${t('Teacher')}`
    : data.students.filter((s) => s.parentId === peer.id).map((s) => s.name).join(', ');

  const send = () => {
    const msg = text.trim();
    if (!msg) return;
    sendMessage(peer.id, msg);
    setText('');
  };

  let lastDay = '';
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: peer.name }} />
      <View style={s.peerBar}>
        <Text style={s.peerSub}>{subtitle}</Text>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={s.list}>
        {thread.length === 0 && <EmptyState icon="chatbubbles-outline" text={t('Say hello 👋')} />}
        {thread.map((m) => {
          const mine = m.from === user.id;
          const day = toDateStr(new Date(m.createdAt));
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <View key={m.id}>
              {showDay && <Text style={s.day}>{formatDate(day)}</Text>}
              <View style={[s.bubble, mine ? s.mine : s.other]}>
                <Text style={{ color: mine ? '#fff' : colors.text, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
                <Text style={[s.time, { color: mine ? '#C7D2FE' : colors.muted }]}>
                  {clock(m.createdAt)}{mine ? (m.read ? '  ✓✓' : '  ✓') : ''}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={s.inputBar}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('Type a message…')}
          placeholderTextColor={colors.muted}
          style={s.input}
          multiline
          onSubmitEditing={send}
          blurOnSubmit={false}
          onKeyPress={(e) => {
            // Enter sends on web; Shift+Enter makes a new line
            const ne = e.nativeEvent as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && ne.key === 'Enter' && !ne.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Pressable onPress={send} style={({ pressed }) => [s.send, { opacity: text.trim() ? (pressed ? 0.7 : 1) : 0.4 }]}>
          <Ionicons name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = themedStyles(() => ({
  peerBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  peerSub: { color: colors.muted, fontSize: 13 },
  list: { padding: 16, paddingBottom: 24, width: '100%' as const, maxWidth: 720, alignSelf: 'center' as const },
  day: { alignSelf: 'center' as const, color: colors.muted, fontSize: 12, marginVertical: 10, backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' as const },
  bubble: { maxWidth: '80%' as const, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, marginBottom: 6 },
  mine: { alignSelf: 'flex-end' as const, backgroundColor: colors.bubbleMine, borderBottomRightRadius: 4 },
  other: { alignSelf: 'flex-start' as const, backgroundColor: colors.bubbleOther, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  time: { fontSize: 11, marginTop: 3, alignSelf: 'flex-end' as const },
  inputBar: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, gap: 8, padding: 10, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  input: {
    flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11,
    backgroundColor: colors.input, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center' as const, justifyContent: 'center' as const },
}));
