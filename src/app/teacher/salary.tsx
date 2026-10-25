import { Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { Badge, Card, EmptyState, IconButton, Screen, SectionTitle, StatCard, StatGrid, styles } from '@/components/ui';
import { netSalary, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { sharePayslip } from '@/lib/payslip';
import { formatMonth, money, notify, thisMonth } from '@/lib/utils';

export default function MySalary() {
  const { data, user } = useStore();
  const records = data.salaries.filter((s) => s.teacherId === user?.id).sort((a, b) => b.month.localeCompare(a.month));
  const current = records.find((r) => r.month === thisMonth());
  const year = String(new Date().getFullYear());
  const paidThisYear = records.filter((r) => r.status === 'paid' && r.month.startsWith(year)).reduce((s, r) => s + netSalary(r), 0);

  return (
    <Screen>
      <Card style={{ backgroundColor: colors.header }}>
        <Text style={{ color: '#C7D2FE' }}>{t('Monthly salary')}</Text>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 2 }}>{money(user?.salary ?? 0)}</Text>
        <View style={[styles.row, { marginTop: 10, gap: 8 }]}>
          <Text style={{ color: '#C7D2FE' }}>{formatMonth(thisMonth())}:</Text>
          {current ? (
            <Badge text={`${t(current.status === 'paid' ? 'Paid' : 'Pending')} · ${money(netSalary(current))}`}
              color={current.status === 'paid' ? '#15803D' : '#B45309'} soft={current.status === 'paid' ? '#DCFCE7' : '#FEF3C7'} />
          ) : (
            <Text style={{ color: '#C7D2FE' }}>{t('Not generated yet')}</Text>
          )}
        </View>
      </Card>

      <StatGrid>
        <StatCard icon="cash" label={`${t('Received in')} ${year}`} value={money(paidThisYear)} color={colors.success} soft={colors.successSoft} />
        <StatCard icon="time" label={t('Pending')} value={money(records.filter((r) => r.status === 'unpaid').reduce((s, r) => s + netSalary(r), 0))}
          color={colors.warning} soft={colors.warningSoft} />
      </StatGrid>

      <SectionTitle title={t('Salary history')} />
      {records.length === 0 && <EmptyState icon="cash-outline" text={t('No salary records')} />}
      {records.map((r) => (
        <Card key={r.id}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{formatMonth(r.month)} · {money(netSalary(r))}</Text>
              <Text style={styles.muted}>
                {t('Basic salary')} {money(r.amount)}
                {r.bonus ? ` · +${money(r.bonus)} ${t('bonus')}` : ''}
                {r.deduction ? ` · −${money(r.deduction)} ${t('deduction')}` : ''}
              </Text>
              {r.paidOn && <Text style={styles.muted}>{t('Paid on')} {r.paidOn}</Text>}
              {!!r.note && <Text style={[styles.muted, { fontStyle: 'italic' }]}>📝 {r.note}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Badge text={t(r.status === 'paid' ? 'Paid' : 'Pending')}
                color={r.status === 'paid' ? colors.success : colors.warning} soft={r.status === 'paid' ? colors.successSoft : colors.warningSoft} />
              <IconButton icon="document-text-outline" color={colors.primary} label={`${t('Payslip')}: ${formatMonth(r.month)}`}
                onPress={() => sharePayslip(data, r).catch((e: Error) => notify(t('Could not create PDF'), e.message))} />
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
