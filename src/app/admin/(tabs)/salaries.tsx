import { useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/components/theme';
import {
  Avatar, Badge, Button, Card, Chips, EmptyState, ListItem, ProgressBar, Screen, StatCard, StatGrid, styles,
} from '@/components/ui';
import { salarySummary, useStore } from '@/data/store';
import type { PayStatus } from '@/data/types';
import { t } from '@/lib/i18n';
import { confirmAction, formatMonth, money, nextMonth, notify, thisMonth } from '@/lib/utils';

type Filter = 'all' | PayStatus;

export default function Salaries() {
  const { data, generateSalaries, markSalaryPaid } = useStore();
  const months = [...new Set(data.salaries.map((s) => s.month))].sort().reverse();
  const [month, setMonth] = useState(months.includes(thisMonth()) ? thisMonth() : months[0] ?? thisMonth());
  const [filter, setFilter] = useState<Filter>('all');

  const sum = salarySummary(data, month);
  const pct = sum.total ? Math.round((sum.paid / sum.total) * 100) : 0;
  const rows = data.salaries
    .filter((s) => s.month === month && (filter === 'all' || s.status === filter))
    .map((s) => ({ rec: s, teacher: data.users.find((u) => u.id === s.teacherId) }))
    .filter((r) => r.teacher)
    .sort((a, b) => a.rec.status.localeCompare(b.rec.status) || a.teacher!.name.localeCompare(b.teacher!.name));

  const upcoming = nextMonth(months[0] ?? thisMonth());

  return (
    <Screen>
      <Chips options={months.map((m) => ({ label: formatMonth(m), value: m }))} value={month} onChange={setMonth} />

      <Card>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <View>
            <Text style={styles.muted}>{t('Total salary')} · {formatMonth(month)}</Text>
            <Text style={[styles.h1, { fontSize: 26 }]}>{money(sum.total)}</Text>
          </View>
          <Badge text={`${sum.paidCount}/${sum.count} ${t('paid')}`} color={colors.success} soft={colors.successSoft} />
        </View>
        <ProgressBar pct={pct} color={colors.success} />
      </Card>

      <StatGrid>
        <StatCard icon="checkmark-circle" label={t('Paid')} value={money(sum.paid)} color={colors.success} soft={colors.successSoft} />
        <StatCard icon="time" label={t('Unpaid')} value={money(sum.unpaid)} color={colors.danger} soft={colors.dangerSoft} />
      </StatGrid>

      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
        <Chips<Filter>
          options={[{ label: t('All'), value: 'all' }, { label: t('Unpaid'), value: 'unpaid' }, { label: t('Paid'), value: 'paid' }]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <Card style={{ paddingVertical: 4 }}>
        {rows.length === 0 && <EmptyState icon="cash-outline" text={t('No salary records')} />}
        {rows.map(({ rec, teacher }, i) => (
          <ListItem
            key={rec.id}
            last={i === rows.length - 1}
            left={<Avatar name={teacher!.name} color={colors.info} />}
            title={teacher!.name}
            subtitle={`${t(teacher!.subject ?? '')} · ${money(rec.amount)}${rec.paidOn ? `\n${t('Paid on')} ${rec.paidOn}` : ''}`}
            right={
              rec.status === 'paid' ? (
                <Badge text={`✓ ${t('Paid')}`} color={colors.success} soft={colors.successSoft} />
              ) : (
                <Button small variant="success" title={t('Pay')} icon="cash-outline" onPress={() =>
                  confirmAction(t('Mark salary as paid'), `${teacher!.name} — ${money(rec.amount)} (${formatMonth(rec.month)})`, () => markSalaryPaid(rec.id))} />
              )
            }
          />
        ))}
      </Card>

      <Button variant="outline" icon="add-circle-outline" title={`${t('Generate salaries for')} ${formatMonth(upcoming)}`}
        onPress={() => confirmAction(t('Generate salaries'), `${formatMonth(upcoming)}: ${t('create salary records for all teachers?')}`, () => {
          const n = generateSalaries(upcoming);
          setMonth(upcoming);
          notify(t('Salaries generated'), `${n} ${t('records created.')}`);
        })} />
      <Text style={[styles.muted, { textAlign: 'center', marginTop: 10 }]}>{t('Change a teacher\'s salary from the Teachers tab.')}</Text>
    </Screen>
  );
}
