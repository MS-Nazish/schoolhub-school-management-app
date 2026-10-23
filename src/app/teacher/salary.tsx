import { Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { Badge, Card, EmptyState, Screen, SectionTitle, StatCard, StatGrid, styles } from '@/components/ui';
import { useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { formatMonth, money, thisMonth } from '@/lib/utils';

export default function MySalary() {
  const { data, user } = useStore();
  const records = data.salaries.filter((s) => s.teacherId === user?.id).sort((a, b) => b.month.localeCompare(a.month));
  const current = records.find((r) => r.month === thisMonth());
  const year = String(new Date().getFullYear());
  const paidThisYear = records.filter((r) => r.status === 'paid' && r.month.startsWith(year)).reduce((s, r) => s + r.amount, 0);

  return (
    <Screen>
      <Card style={{ backgroundColor: colors.header }}>
        <Text style={{ color: '#C7D2FE' }}>{t('Monthly salary')}</Text>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 2 }}>{money(user?.salary ?? 0)}</Text>
        <View style={[styles.row, { marginTop: 10, gap: 8 }]}>
          <Text style={{ color: '#C7D2FE' }}>{formatMonth(thisMonth())}:</Text>
          {current ? (
            <Badge text={t(current.status === 'paid' ? 'Paid' : 'Pending')}
              color={current.status === 'paid' ? '#15803D' : '#B45309'} soft={current.status === 'paid' ? '#DCFCE7' : '#FEF3C7'} />
          ) : (
            <Text style={{ color: '#C7D2FE' }}>{t('Not generated yet')}</Text>
          )}
        </View>
      </Card>

      <StatGrid>
        <StatCard icon="cash" label={`${t('Received in')} ${year}`} value={money(paidThisYear)} color={colors.success} soft={colors.successSoft} />
        <StatCard icon="time" label={t('Pending')} value={money(records.filter((r) => r.status === 'unpaid').reduce((s, r) => s + r.amount, 0))}
          color={colors.warning} soft={colors.warningSoft} />
      </StatGrid>

      <SectionTitle title={t('Salary history')} />
      {records.length === 0 && <EmptyState icon="cash-outline" text={t('No salary records')} />}
      {records.map((r) => (
        <Card key={r.id}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View>
              <Text style={styles.listTitle}>{formatMonth(r.month)}</Text>
              <Text style={styles.muted}>{money(r.amount)}{r.paidOn ? ` · ${t('Paid on')} ${r.paidOn}` : ''}</Text>
            </View>
            <Badge text={t(r.status === 'paid' ? 'Paid' : 'Pending')}
              color={r.status === 'paid' ? colors.success : colors.warning} soft={r.status === 'paid' ? colors.successSoft : colors.warningSoft} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
