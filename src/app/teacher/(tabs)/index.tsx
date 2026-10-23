import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { NoticeCard } from '@/components/shared';
import { DayPeriods, isSunday } from '@/components/Timetable';
import { colors } from '@/components/theme';
import { Banner, Button, Card, EmptyState, QuickActions, Screen, SectionTitle, StatCard, StatGrid, styles } from '@/components/ui';
import { noticesFor, unreadMessages, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { dayOfWeek, formatDate, today } from '@/lib/utils';

export default function TeacherHome() {
  const { data, user } = useStore();
  if (!user) return null;

  const myClassIds = user.classIds ?? [];
  const myStudents = data.students.filter((s) => myClassIds.includes(s.classId));
  const todaysPeriods = data.timetable.filter((e) => e.teacherId === user.id && e.day === dayOfWeek(today()));
  const unmarked = myClassIds.filter((c) => !data.attendance.some((a) => a.id === `${c}_${today()}`));
  const unread = unreadMessages(data, user.id);
  const notices = noticesFor(data, 'teacher');

  return (
    <Screen>
      <Text style={styles.h1}>{t('Hello, {name}', { name: user.name.split(' ')[0]! })} 👋</Text>
      <Text style={[styles.muted, { marginBottom: 16 }]}>{formatDate(today())} · {t(user.subject ?? '')} {t('Teacher')}</Text>

      {!isSunday() && unmarked.length > 0 && (
        <Banner icon="alert-circle" color={colors.warning} soft={colors.warningSoft}
          text={t('Attendance not marked for {n} class(es) today', { n: unmarked.length })}
          onPress={() => router.push('/teacher/attendance')} />
      )}
      {unread > 0 && (
        <Banner icon="chatbubbles" color={colors.info} soft={colors.infoSoft}
          text={t('You have {n} unread message(s)', { n: unread })} onPress={() => router.push('/teacher/messages')} />
      )}

      <StatGrid>
        <StatCard icon="business" label={t('My classes')} value={myClassIds.length} />
        <StatCard icon="people" label={t('My students')} value={myStudents.length} color={colors.info} soft={colors.infoSoft} />
      </StatGrid>

      <QuickActions items={[
        { icon: 'checkbox', label: t('Attendance'), color: colors.success, soft: colors.successSoft, onPress: () => router.push('/teacher/attendance') },
        { icon: 'time', label: t('Timetable'), color: colors.primary, soft: colors.primarySoft, onPress: () => router.push('/teacher/timetable') },
        { icon: 'cash', label: t('My Salary'), color: colors.warning, soft: colors.warningSoft, onPress: () => router.push('/teacher/salary') },
        { icon: 'megaphone', label: t('Notices'), color: colors.purple, soft: colors.purpleSoft, onPress: () => router.push('/teacher/notices') },
      ]} />

      <SectionTitle title={t("Today's classes")} right={<Button small variant="ghost" title={t('Full week')} onPress={() => router.push('/teacher/timetable')} />} />
      <Card style={{ paddingVertical: 6 }}>
        {isSunday() ? <EmptyState icon="sunny-outline" text={t('Sunday — no classes today. Enjoy your day!')} /> : <DayPeriods entries={todaysPeriods} mode="class" now />}
      </Card>

      <SectionTitle title={t('Latest notice')} />
      {notices[0] ? <NoticeCard notice={notices[0]} /> : <EmptyState text={t('No notices yet')} />}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
