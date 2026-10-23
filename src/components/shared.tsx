// Pieces reused across the role layouts and screens
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from './theme';
import { Badge, Card, CountBadge, EmptyState, IconButton, styles } from './ui';
import { unreadNotifications, useStore } from '@/data/store';
import type { Notice, Role } from '@/data/types';
import { t } from '@/lib/i18n';
import { showPhoneAlert } from '@/lib/push';
import { timeAgo } from '@/lib/utils';

/** Bell (with unread count) and settings buttons shown in every role's header */
export function HeaderActions() {
  const { data, user } = useStore();
  const unread = user ? unreadNotifications(data, user.id) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16 }}>
      <Pressable onPress={() => router.push('/notifications')} hitSlop={10} accessibilityLabel={t('Notifications')}>
        <Ionicons name="notifications-outline" size={24} color="#fff" />
        <CountBadge count={unread} style={{ position: 'absolute', top: -6, right: -8 }} />
      </Pressable>
      <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityLabel={t('Settings')}>
        <Ionicons name="settings-outline" size={23} color="#fff" />
      </Pressable>
    </View>
  );
}

/** Shows new in-app notifications for the logged-in user as phone alerts */
function PhoneAlertBridge() {
  const { data, user, settings, markPushed } = useStore();
  const fresh = data.notifications.filter((n) => n.userId === user?.id && !n.pushed);
  const key = fresh.map((n) => n.id).join(',');

  useEffect(() => {
    if (!fresh.length) return;
    if (settings.pushEnabled) fresh.slice(0, 3).forEach((n) => showPhoneAlert(n.title, n.body));
    markPushed(fresh.map((n) => n.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

/**
 * Stack for one role: its tabs plus extra pages (timetable, notices…) pushed on top.
 * Redirects away if the logged-in user has a different role.
 */
export function RoleStack({ role, pages }: { role: Role; pages: { name: string; title: string }[] }) {
  const { user, loaded } = useStore();
  if (loaded && user?.role !== role) return <Redirect href="/" />;

  // The navigator stays mounted while saved data loads (unmounting it would lose a deep-linked page);
  // an overlay hides the screens until the data is ready.
  return (
    <>
      {loaded && <PhoneAlertBridge />}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {pages.map((p) => <Stack.Screen key={p.name} name={p.name} options={{ title: t(p.title) }} />)}
      </Stack>
      {!loaded && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
    </>
  );
}

export type TabDef = { name: string; title: string; icon: React.ComponentProps<typeof Ionicons>['name']; badge?: number };

/** Bottom tabs shared by all three roles */
export function RoleTabs({ tabs }: { tabs: TabDef[] }) {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => <HeaderActions />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.title),
            tabBarBadge: tab.badge || undefined,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={(focused ? tab.icon : `${tab.icon}-outline`) as TabDef['icon']} size={size} color={color as string} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const audienceLabel = { all: 'Everyone', teachers: 'Teachers', parents: 'Parents' };

export function NoticeCard({ notice, onDelete }: { notice: Notice; onDelete?: () => void }) {
  return (
    <Card>
      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 6 }]}>
        <View style={[styles.row, { gap: 8, flex: 1 }]}>
          <Ionicons name="megaphone" size={18} color={colors.warning} />
          <Text style={[styles.listTitle, { flex: 1 }]}>{notice.title}</Text>
        </View>
        {onDelete && <IconButton icon="trash-outline" color={colors.danger} onPress={onDelete} />}
      </View>
      <Text style={styles.body}>{notice.body}</Text>
      <View style={[styles.row, { justifyContent: 'space-between', marginTop: 10 }]}>
        <Text style={styles.muted}>{notice.by} · {timeAgo(notice.createdAt)}</Text>
        <Badge text={t(audienceLabel[notice.audience])} color={colors.warning} soft={colors.warningSoft} />
      </View>
    </Card>
  );
}

export function NoticeList({ notices, onDelete }: { notices: Notice[]; onDelete?: (id: string) => void }) {
  if (!notices.length) return <EmptyState icon="megaphone-outline" text={t('No notices yet')} />;
  return (
    <>
      {notices.map((n) => (
        <NoticeCard key={n.id} notice={n} onDelete={onDelete ? () => onDelete(n.id) : undefined} />
      ))}
    </>
  );
}
