import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { Card, EmptyState, Screen, styles } from '@/components/ui';
import { useStore } from '@/data/store';
import type { NotificationKind } from '@/data/types';
import { t } from '@/lib/i18n';
import { timeAgo } from '@/lib/utils';

const KIND: Record<NotificationKind, { icon: React.ComponentProps<typeof Ionicons>['name']; color: keyof typeof colors; soft: keyof typeof colors }> = {
  attendance: { icon: 'alert-circle', color: 'danger', soft: 'dangerSoft' },
  homework: { icon: 'book', color: 'primary', soft: 'primarySoft' },
  notice: { icon: 'megaphone', color: 'warning', soft: 'warningSoft' },
  fee: { icon: 'wallet', color: 'warning', soft: 'warningSoft' },
  salary: { icon: 'cash', color: 'success', soft: 'successSoft' },
  message: { icon: 'chatbubbles', color: 'info', soft: 'infoSoft' },
  result: { icon: 'ribbon', color: 'purple', soft: 'purpleSoft' },
};

export default function Notifications() {
  const { data, user, loaded, markNotificationsRead } = useStore();
  // Remember which were unread when the screen opened, so they stay highlighted after being marked read
  const [unreadIds, setUnreadIds] = useState<Set<string> | null>(null);
  const mine = data.notifications
    .filter((n) => n.userId === user?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  useEffect(() => {
    if (!loaded || !user) return;
    if (!unreadIds) setUnreadIds(new Set(mine.filter((n) => !n.read).map((n) => n.id)));
    markNotificationsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, user?.id, mine.length]);

  return (
    <Screen>
      {mine.length === 0 && <EmptyState icon="notifications-off-outline" text={t('No notifications yet')} />}
      {mine.map((n) => {
        const k = KIND[n.kind];
        const isNew = unreadIds ? unreadIds.has(n.id) : !n.read;
        return (
          <Card key={n.id} style={isNew ? { borderLeftWidth: 4, borderLeftColor: colors.accent } : undefined}>
            <View style={[styles.row, { alignItems: 'flex-start', gap: 12 }]}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors[k.soft], alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={k.icon} size={20} color={colors[k.color]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{n.title}</Text>
                <Text style={[styles.body, { marginTop: 2 }]}>{n.body}</Text>
                <Text style={[styles.muted, { marginTop: 6, fontSize: 12 }]}>{timeAgo(n.createdAt)}{isNew ? ` · ${t('New')}` : ''}</Text>
              </View>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
