import { Text, View } from 'react-native';

import { ChildSwitcher, useChild } from '@/components/ChildContext';
import { colors } from '@/components/theme';
import { Badge, Card, EmptyState, ProgressBar, Screen, SectionTitle, StatCard, StatGrid, styles } from '@/components/ui';
import { attendanceStats, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/utils';

export default function ParentAttendance() {
  const { data } = useStore();
  const { child } = useChild();
  if (!child) return <Screen><EmptyState text={t('No children linked to your account')} /></Screen>;

  const LABEL = {
    P: { text: t('Present'), color: colors.success, soft: colors.successSoft },
    A: { text: t('Absent'), color: colors.danger, soft: colors.dangerSoft },
    L: { text: t('Leave'), color: colors.warning, soft: colors.warningSoft },
  };
  const stats = attendanceStats(data, child.id);
  const records = data.attendance
    .filter((a) => a.classId === child.classId && a.marks[child.id])
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Screen>
      <ChildSwitcher />
      <Card>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={styles.listTitle}>{t('Overall attendance')}</Text>
          <Text style={[styles.listTitle, { color: stats.pct >= 85 ? colors.success : colors.warning }]}>{stats.pct}%</Text>
        </View>
        <ProgressBar pct={stats.pct} color={stats.pct >= 85 ? colors.success : colors.warning} />
        <Text style={[styles.muted, { marginTop: 8 }]}>
          {stats.pct >= 85 ? t('Great attendance! Keep it up.') : t('Attendance is below 85%. Please ensure regular attendance.')}
        </Text>
      </Card>

      <StatGrid>
        <StatCard icon="checkmark-circle" label={t('Present')} value={stats.present} color={colors.success} soft={colors.successSoft} />
        <StatCard icon="close-circle" label={t('Absent')} value={stats.absent} color={colors.danger} soft={colors.dangerSoft} />
      </StatGrid>

      <SectionTitle title={t('Daily record')} />
      <Card style={{ paddingVertical: 4 }}>
        {records.length === 0 && <EmptyState text={t('No attendance recorded yet')} />}
        {records.map((r, i) => {
          const l = LABEL[r.marks[child.id]!];
          return (
            <View key={r.id} style={[styles.row, { justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i === records.length - 1 ? 0 : 1, borderBottomColor: colors.border }]}>
              <Text style={styles.body}>{formatDate(r.date)}</Text>
              <Badge text={l.text} color={l.color} soft={l.soft} />
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
