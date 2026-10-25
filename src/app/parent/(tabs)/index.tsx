import { router } from 'expo-router';
import { Text } from 'react-native';

import { ChildSwitcher, useChild } from '@/components/ChildContext';
import { HomeworkCard } from '@/components/HomeworkCard';
import { NoticeList } from '@/components/shared';
import { DayPeriods, isSunday } from '@/components/Timetable';
import { colors } from '@/components/theme';
import { Banner, Button, Card, EmptyState, QuickActions, Screen, SectionTitle, StatCard, StatGrid, styles } from '@/components/ui';
import { attendanceStats, netFee, noticesFor, unreadMessages, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { dayOfWeek, money, today } from '@/lib/utils';

export default function ParentHome() {
  const { data, user } = useStore();
  const { child } = useChild();

  if (!child || !user) return <Screen><EmptyState icon="people-outline" text={t('No children linked to your account')} /></Screen>;

  const first = child.name.split(' ')[0]!;
  const att = attendanceStats(data, child.id);
  const todayMark = data.attendance.find((a) => a.id === `${child.classId}_${today()}`)?.marks[child.id];
  const unpaid = data.fees.filter((f) => f.studentId === child.id && f.status === 'unpaid');
  const upcoming = data.homework
    .filter((h) => h.classId === child.classId && h.dueDate >= today())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const results = data.results.filter((r) => r.studentId === child.id);
  const avg = results.length ? Math.round(results.reduce((s, r) => s + (r.marks / r.total) * 100, 0) / results.length) : null;
  const todaysPeriods = data.timetable.filter((e) => e.classId === child.classId && e.day === dayOfWeek(today()));
  const unread = unreadMessages(data, user.id);

  return (
    <Screen>
      <Text style={[styles.h1, { fontSize: 20, marginBottom: 12 }]}>{t('Assalam-o-Alaikum, {name}', { name: user.name.split(' ')[0]! })}</Text>
      <ChildSwitcher />

      {todayMark === 'A' && (
        <Banner icon="alert-circle" text={t('{name} was marked ABSENT today.', { name: first })} color={colors.danger} soft={colors.dangerSoft} />
      )}
      {todayMark === 'P' && (
        <Banner icon="checkmark-circle" text={t('{name} is present in school today.', { name: first })} color={colors.success} soft={colors.successSoft} />
      )}
      {todayMark === 'L' && (
        <Banner icon="information-circle" text={t('{name} is on leave today.', { name: first })} color={colors.warning} soft={colors.warningSoft} />
      )}
      {unpaid.length > 0 && (
        <Banner icon="wallet" text={`${t('Fee due')}: ${money(unpaid.reduce((s, f) => s + netFee(f), 0))}`}
          color={colors.warning} soft={colors.warningSoft} onPress={() => router.push('/parent/fees')} />
      )}
      {unread > 0 && (
        <Banner icon="chatbubbles" text={t('You have {n} unread message(s)', { n: unread })}
          color={colors.info} soft={colors.infoSoft} onPress={() => router.push('/parent/messages')} />
      )}

      <StatGrid>
        <StatCard icon="calendar" label={t('Attendance')} value={`${att.pct}%`} color={colors.success} soft={colors.successSoft}
          onPress={() => router.push('/parent/attendance')} />
        <StatCard icon="ribbon" label={t('Average marks')} value={avg === null ? '—' : `${avg}%`} color={colors.info} soft={colors.infoSoft}
          onPress={() => router.push('/parent/results')} />
      </StatGrid>

      <QuickActions items={[
        { icon: 'book', label: t('Homework'), color: colors.primary, soft: colors.primarySoft, badge: upcoming.length, onPress: () => router.push('/parent/homework') },
        { icon: 'time', label: t('Timetable'), color: colors.info, soft: colors.infoSoft, onPress: () => router.push('/parent/timetable') },
        { icon: 'chatbubbles', label: t('Messages'), color: colors.success, soft: colors.successSoft, badge: unread, onPress: () => router.push('/parent/messages') },
        { icon: 'person', label: t('Profile'), color: colors.purple, soft: colors.purpleSoft, onPress: () => router.push(`/student/${child.id}`) },
      ]} />

      <SectionTitle title={t("Today's timetable")} right={<Button small variant="ghost" title={t('Full week')} onPress={() => router.push('/parent/timetable')} />} />
      <Card style={{ paddingVertical: 6 }}>
        {isSunday() ? <EmptyState icon="sunny-outline" text={t('Sunday — school is closed today.')} /> : <DayPeriods entries={todaysPeriods} mode="teacher" now />}
      </Card>

      <SectionTitle
        title={t('Upcoming homework')}
        right={<Button small variant="ghost" title={t('See all')} onPress={() => router.push('/parent/homework')} />}
      />
      {upcoming.length ? upcoming.slice(0, 2).map((h) => <HomeworkCard key={h.id} hw={h} />) : <EmptyState text={t('No pending homework 🎉')} />}

      <SectionTitle title={t('School notices')} />
      <NoticeList notices={noticesFor(data, 'parent')} />
    </Screen>
  );
}
