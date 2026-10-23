import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { colors } from './theme';
import { Avatar, Card, CountBadge, EmptyState, ListItem, Screen, styles } from './ui';
import { chatContacts, unreadMessages, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { timeAgo } from '@/lib/utils';

/** List of people the user can message, most recent conversation first */
export function ChatList() {
  const { data, user } = useStore();
  if (!user) return null;

  const rows = chatContacts(data, user)
    .map((peer) => {
      const thread = data.messages.filter((m) => (m.from === user.id && m.to === peer.id) || (m.from === peer.id && m.to === user.id));
      const last = thread.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return { peer, last, unread: unreadMessages(data, user.id, peer.id) };
    })
    .sort((a, b) => (b.last?.createdAt ?? '').localeCompare(a.last?.createdAt ?? '') || a.peer.name.localeCompare(b.peer.name));

  const subtitleFor = (peerId: string, role: string, subject?: string) =>
    role === 'teacher'
      ? `${t(subject ?? '')} ${t('Teacher')}`
      : `${t('Parent of')} ${data.students.filter((s) => s.parentId === peerId).map((s) => s.name.split(' ')[0]).join(', ')}`;

  return (
    <Screen>
      <Text style={[styles.muted, { marginBottom: 10 }]}>
        {user.role === 'parent' ? t("Message your child's teachers directly.") : t('Messages from parents of your students.')}
      </Text>
      <Card style={{ paddingVertical: 4 }}>
        {rows.length === 0 && <EmptyState icon="chatbubbles-outline" text={t('No contacts yet')} />}
        {rows.map(({ peer, last, unread }, i) => (
          <ListItem
            key={peer.id}
            last={i === rows.length - 1}
            onPress={() => router.push(`/chat/${peer.id}`)}
            left={<Avatar name={peer.name} color={peer.role === 'teacher' ? colors.info : colors.success} />}
            title={peer.name}
            subtitle={last ? `${last.from === user.id ? `${t('You')}: ` : ''}${last.text}` : subtitleFor(peer.id, peer.role, peer.subject)}
            right={
              <View style={{ alignItems: 'flex-end', gap: 6, marginLeft: 8 }}>
                {last && <Text style={[styles.muted, { fontSize: 11 }]}>{timeAgo(last.createdAt)}</Text>}
                <CountBadge count={unread} />
              </View>
            }
          />
        ))}
      </Card>
    </Screen>
  );
}
