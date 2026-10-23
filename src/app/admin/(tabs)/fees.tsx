import { useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { Badge, Button, Card, Chips, EmptyState, ListItem, Screen, StatCard, StatGrid, styles } from '@/components/ui';
import { className, feeSummary, useStore } from '@/data/store';
import type { PayStatus } from '@/data/types';
import { t } from '@/lib/i18n';
import { confirmAction, formatMonth, money, nextMonth, notify, thisMonth } from '@/lib/utils';

type Filter = 'all' | PayStatus;

export default function Fees() {
  const { data, generateFees, markFeePaid } = useStore();
  const months = [...new Set(data.fees.map((f) => f.month))].sort().reverse();
  const [month, setMonth] = useState(months.includes(thisMonth()) ? thisMonth() : months[0] ?? thisMonth());
  const [filter, setFilter] = useState<Filter>('all');

  const summary = feeSummary(data, month);
  const rows = data.fees
    .filter((f) => f.month === month && (filter === 'all' || f.status === filter))
    .map((f) => ({ fee: f, student: data.students.find((s) => s.id === f.studentId) }))
    .filter((r) => r.student)
    .sort((a, b) => a.student!.name.localeCompare(b.student!.name));

  const upcoming = nextMonth(months[0] ?? thisMonth());

  return (
    <Screen>
      <Chips options={months.map((m) => ({ label: formatMonth(m), value: m }))} value={month} onChange={setMonth} />

      <StatGrid>
        <StatCard icon="checkmark-circle" label={t('Collected')} value={money(summary.collected)} color={colors.success} soft={colors.successSoft} />
        <StatCard icon="time" label={t('Pending')} value={money(summary.pending)} color={colors.danger} soft={colors.dangerSoft} />
      </StatGrid>

      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
        <Text style={styles.muted}>{summary.paidCount} / {summary.count} {t('paid')}</Text>
        <Button small variant="outline" icon="add-circle-outline" title={`${t('Generate')} ${formatMonth(upcoming)}`}
          onPress={() => confirmAction(t('Generate fees'), `${formatMonth(upcoming)}: ${t('create fee vouchers for all students?')}`, () => {
            const n = generateFees(upcoming);
            setMonth(upcoming);
            notify(t('Fees generated'), `${n} ${t('vouchers created. Parents have been notified.')}`);
          })} />
      </View>

      <Chips<Filter>
        options={[{ label: t('All'), value: 'all' }, { label: t('Unpaid'), value: 'unpaid' }, { label: t('Paid'), value: 'paid' }]}
        value={filter}
        onChange={setFilter}
      />

      <Card style={{ paddingVertical: 4 }}>
        {rows.length === 0 && <EmptyState icon="wallet-outline" text={t('No fee records')} />}
        {rows.map(({ fee, student }, i) => (
          <ListItem
            key={fee.id}
            last={i === rows.length - 1}
            title={student!.name}
            subtitle={`${className(data, student!.classId)} · ${money(fee.amount)}${fee.paidOn ? ` · ${t('Paid on')} ${fee.paidOn}` : ''}`}
            right={
              fee.status === 'paid' ? (
                <Badge text={t('Paid')} color={colors.success} soft={colors.successSoft} />
              ) : (
                <Button small title={t('Mark paid')} onPress={() =>
                  confirmAction(t('Mark as paid'), `${student!.name} — ${money(fee.amount)}`, () => markFeePaid(fee.id))} />
              )
            }
          />
        ))}
      </Card>
    </Screen>
  );
}
