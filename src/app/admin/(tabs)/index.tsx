import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { NoticeCard } from '@/components/shared';
import { colors } from '@/components/theme';
import { Badge, Button, Card, ProgressBar, QuickActions, Screen, SectionTitle, StatCard, StatGrid, styles } from '@/components/ui';
import { feeSummary, salarySummary, todayAttendancePct, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { formatDate, formatMonth, money, thisMonth, today } from '@/lib/utils';

export default function AdminDashboard() {
  const { data, user } = useStore();
  const teachers = data.users.filter((u) => u.role === 'teacher');
  const attPct = todayAttendancePct(data);
  const fees = feeSummary(data);
  const feePct = fees.collected + fees.pending ? Math.round((fees.collected / (fees.collected + fees.pending)) * 100) : 0;
  const sal = salarySummary(data);

  return (
    <Screen>
      <Text style={styles.h1}>{t('Hello, {name}', { name: user?.name.split(' ')[0] ?? '' })} 👋</Text>
      <Text style={[styles.muted, { marginBottom: 16 }]}>{formatDate(today())}</Text>

      <StatGrid>
        <StatCard icon="people" label={t('Students')} value={data.students.length} onPress={() => router.push('/admin/students')} />
        <StatCard icon="school" label={t('Teachers')} value={teachers.length} color={colors.info} soft={colors.infoSoft}
          onPress={() => router.push('/admin/teachers')} />
        <StatCard icon="checkmark-done" label={t('Attendance today')} value={attPct === null ? '—' : `${attPct}%`}
          color={colors.success} soft={colors.successSoft} />
        <StatCard icon="business" label={t('Classes')} value={data.classes.length} color={colors.warning} soft={colors.warningSoft} />
      </StatGrid>

      <QuickActions items={[
        { icon: 'time', label: t('Timetable'), color: colors.primary, soft: colors.primarySoft, onPress: () => router.push('/admin/timetable') },
        { icon: 'megaphone', label: t('Notices'), color: colors.warning, soft: colors.warningSoft, onPress: () => router.push('/admin/notices') },
        { icon: 'cash', label: t('Salaries'), color: colors.success, soft: colors.successSoft, onPress: () => router.push('/admin/salaries') },
        { icon: 'settings', label: t('Settings'), color: colors.purple, soft: colors.purpleSoft, onPress: () => router.push('/settings') },
      ]} />

      <Card>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={styles.listTitle}>{t('Fees')} · {formatMonth(thisMonth())}</Text>
          <Badge text={`${feePct}% ${t('collected')}`} color={colors.success} soft={colors.successSoft} />
        </View>
        <ProgressBar pct={feePct} color={colors.success} />
        <View style={[styles.row, { justifyContent: 'space-between', marginTop: 12 }]}>
          <View>
            <Text style={styles.muted}>{t('Collected')}</Text>
            <Text style={[styles.listTitle, { color: colors.success }]}>{money(fees.collected)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.muted}>{t('Pending')}</Text>
            <Text style={[styles.listTitle, { color: colors.danger }]}>{money(fees.pending)}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={styles.listTitle}>{t('Teacher salaries')} · {formatMonth(thisMonth())}</Text>
          <Badge text={`${sal.paidCount}/${sal.count} ${t('paid')}`} color={colors.info} soft={colors.infoSoft} />
        </View>
        <ProgressBar pct={sal.total ? (sal.paid / sal.total) * 100 : 0} color={colors.info} />
        <View style={[styles.row, { justifyContent: 'space-between', marginTop: 12 }]}>
          <View>
            <Text style={styles.muted}>{t('Paid')}</Text>
            <Text style={[styles.listTitle, { color: colors.success }]}>{money(sal.paid)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.muted}>{t('Unpaid')}</Text>
            <Text style={[styles.listTitle, { color: colors.danger }]}>{money(sal.unpaid)}</Text>
          </View>
        </View>
      </Card>

      <SectionTitle title={t("Today's attendance by class")} />
      <Card>
        {data.classes.map((c) => {
          const rec = data.attendance.find((a) => a.id === `${c.id}_${today()}`);
          const count = data.students.filter((s) => s.classId === c.id).length;
          const present = rec ? Object.values(rec.marks).filter((m) => m === 'P').length : 0;
          return (
            <View key={c.id} style={[styles.row, { justifyContent: 'space-between', paddingVertical: 8 }]}>
              <Text style={styles.body}>{c.name}</Text>
              {rec ? (
                <Badge text={`${present}/${count} ${t('present')}`} color={colors.success} soft={colors.successSoft} />
              ) : (
                <Badge text={t('Not marked')} color={colors.muted} soft={colors.bg} />
              )}
            </View>
          );
        })}
      </Card>

      <SectionTitle
        title={t('Latest notice')}
        right={<Button small variant="ghost" title={t('See all')} onPress={() => router.push('/admin/notices')} />}
      />
      {data.notices[0] ? <NoticeCard notice={data.notices[0]} /> : <Text style={styles.muted}>{t('No notices yet')}</Text>}
    </Screen>
  );
}
