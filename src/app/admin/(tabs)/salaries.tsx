import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/components/theme';
import {
  Avatar, Badge, Button, Card, Chips, EmptyState, IconButton, Input, ProgressBar, Screen, Segmented, SectionTitle,
  StatCard, StatGrid, styles,
} from '@/components/ui';
import { netSalary, salarySummary, useStore } from '@/data/store';
import type { PayStatus, SalaryRecord } from '@/data/types';
import { t } from '@/lib/i18n';
import { sharePayslip } from '@/lib/payslip';
import { confirmAction, formatMonth, money, nextMonth, notify, thisMonth, today } from '@/lib/utils';

type Filter = 'all' | PayStatus;
type Draft = { amount: string; bonus: string; deduction: string; note: string; status: PayStatus; paidOn: string };

const digits = (v: string) => v.replace(/[^0-9]/g, '');
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime());

export default function Salaries() {
  const { data, generateSalaries, markSalaryPaid, updateSalary, payAllSalaries } = useStore();
  const months = [...new Set(data.salaries.map((s) => s.month))].sort().reverse();
  const [pickedMonth, setMonth] = useState('');
  // Default to this month (or the latest one); the page can open before the data has loaded
  const month = months.includes(pickedMonth) ? pickedMonth : months.includes(thisMonth()) ? thisMonth() : months[0] ?? thisMonth();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const sum = salarySummary(data, month);
  const pct = sum.total ? Math.round((sum.paid / sum.total) * 100) : 0;
  const all = data.salaries
    .filter((s) => s.month === month)
    .map((rec) => ({ rec, teacher: data.users.find((u) => u.id === rec.teacherId) }))
    .filter((r) => r.teacher)
    // Unpaid first (they need action), then by name
    .sort((a, b) => Number(a.rec.status === 'paid') - Number(b.rec.status === 'paid') || a.teacher!.name.localeCompare(b.teacher!.name));
  const rows = all.filter((r) => filter === 'all' || r.rec.status === filter);
  const extras = all.reduce((n, { rec }) => ({ bonus: n.bonus + (rec.bonus ?? 0), deduction: n.deduction + (rec.deduction ?? 0) }), { bonus: 0, deduction: 0 });
  const upcoming = nextMonth(months[0] ?? thisMonth());

  const startEdit = (rec: SalaryRecord) => {
    setEditing(rec.id);
    setDraft({
      amount: String(rec.amount), bonus: rec.bonus ? String(rec.bonus) : '', deduction: rec.deduction ? String(rec.deduction) : '',
      note: rec.note ?? '', status: rec.status, paidOn: rec.paidOn ?? today(),
    });
  };

  const saveEdit = (rec: SalaryRecord) => {
    if (!draft) return;
    const amount = Number(draft.amount);
    const bonus = Number(draft.bonus || 0);
    const deduction = Number(draft.deduction || 0);
    if (!amount || amount <= 0) return notify(t('Invalid salary'), t('Enter the monthly salary in rupees.'));
    if (deduction > amount + bonus) return notify(t('Invalid deduction'), t('The deduction cannot be more than the salary.'));
    if (draft.status === 'paid' && !isDate(draft.paidOn)) return notify(t('Invalid date'), t('Enter the paid date as YYYY-MM-DD.'));
    updateSalary(rec.id, {
      amount, bonus: bonus || undefined, deduction: deduction || undefined, note: draft.note.trim() || undefined,
      status: draft.status, paidOn: draft.status === 'paid' ? draft.paidOn : undefined,
    });
    setEditing(null);
  };

  const payslip = (rec: SalaryRecord) =>
    sharePayslip(data, rec).catch((e: Error) => notify(t('Could not create PDF'), e.message));

  return (
    <Screen>
      <Chips options={months.map((m) => ({ label: formatMonth(m), value: m }))} value={month} onChange={(m) => { setMonth(m); setEditing(null); }} />

      {/* Month summary */}
      <Card>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <View>
            <Text style={styles.muted}>{t('Total payroll')} · {formatMonth(month)}</Text>
            <Text style={[styles.h1, { fontSize: 26 }]}>{money(sum.total)}</Text>
          </View>
          <Badge text={`${sum.paidCount}/${sum.count} ${t('paid')}`} color={colors.success} soft={colors.successSoft} />
        </View>
        <ProgressBar pct={pct} color={colors.success} />
        {(extras.bonus > 0 || extras.deduction > 0) && (
          <Text style={[styles.muted, { marginTop: 8 }]}>
            {t('Includes')} <Text style={{ color: colors.success, fontWeight: '700' }}>+{money(extras.bonus)}</Text> {t('bonus')} ·{' '}
            <Text style={{ color: colors.danger, fontWeight: '700' }}>−{money(extras.deduction)}</Text> {t('deductions')}
          </Text>
        )}
      </Card>

      <StatGrid>
        <StatCard icon="checkmark-circle" label={`${t('Paid')} (${sum.paidCount})`} value={money(sum.paid)} color={colors.success} soft={colors.successSoft} />
        <StatCard icon="time" label={`${t('Unpaid')} (${sum.unpaidCount})`} value={money(sum.unpaid)} color={colors.danger} soft={colors.dangerSoft} />
      </StatGrid>

      <View style={[styles.row, { gap: 8, marginBottom: 12 }]}>
        <Button small variant="success" icon="cash-outline" title={`${t('Pay all unpaid')} (${sum.unpaidCount})`} style={{ flex: 1 }}
          disabled={!sum.unpaidCount}
          onPress={() => confirmAction(t('Pay all unpaid'), t('Mark {n} unpaid salaries for {month} as paid ({amount})?',
            { n: sum.unpaidCount, month: formatMonth(month), amount: money(sum.unpaid) }), () => {
            const n = payAllSalaries(month);
            notify(t('Salaries paid'), t('{n} teacher(s) have been notified.', { n }));
          })} />
        <Button small variant="outline" icon="add-circle-outline" title={`${t('Generate')} ${formatMonth(upcoming)}`} style={{ flex: 1 }}
          onPress={() => confirmAction(t('Generate salaries'), `${formatMonth(upcoming)}: ${t('create salary records for all teachers?')}`, () => {
            const n = generateSalaries(upcoming);
            setMonth(upcoming);
            notify(t('Salaries generated'), `${n} ${t('records created.')}`);
          })} />
      </View>

      <Chips<Filter>
        options={[
          { label: `${t('All')} (${all.length})`, value: 'all' },
          { label: `${t('Unpaid')} (${sum.unpaidCount})`, value: 'unpaid' },
          { label: `${t('Paid')} (${sum.paidCount})`, value: 'paid' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <SectionTitle title={t('Teachers')} />
      {rows.length === 0 && <EmptyState icon="cash-outline" text={t('No salary records')} />}
      {rows.map(({ rec, teacher }) => {
        const paid = rec.status === 'paid';
        const open = editing === rec.id && draft;
        return (
          <Card key={rec.id} style={{ borderLeftWidth: 4, borderLeftColor: paid ? colors.success : colors.danger }}>
            {/* Header */}
            <View style={styles.row}>
              <Avatar name={teacher!.name} size={40} color={colors.info} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.listTitle} onPress={() => router.push(`/admin/teacher/${teacher!.id}`)}>{teacher!.name}</Text>
                <Text style={styles.muted}>{t(teacher!.subject ?? '')}{paid && rec.paidOn ? ` · ${t('Paid on')} ${rec.paidOn}` : ''}</Text>
              </View>
              <Badge text={paid ? `✓ ${t('Paid')}` : t('Unpaid')} color={paid ? colors.success : colors.danger} soft={paid ? colors.successSoft : colors.dangerSoft} />
            </View>

            {/* Breakdown */}
            <View style={{ marginTop: 10, gap: 4 }}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={styles.muted}>{t('Basic salary')}</Text>
                <Text style={styles.body}>{money(rec.amount)}</Text>
              </View>
              {!!rec.bonus && (
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <Text style={styles.muted}>{t('Bonus')}</Text>
                  <Text style={[styles.body, { color: colors.success }]}>+ {money(rec.bonus)}</Text>
                </View>
              )}
              {!!rec.deduction && (
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <Text style={styles.muted}>{t('Deduction')}</Text>
                  <Text style={[styles.body, { color: colors.danger }]}>− {money(rec.deduction)}</Text>
                </View>
              )}
              <View style={[styles.row, { justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }]}>
                <Text style={styles.listTitle}>{t('Net salary')}</Text>
                <Text style={[styles.listTitle, { fontSize: 17 }]}>{money(netSalary(rec))}</Text>
              </View>
              {!!rec.note && <Text style={[styles.muted, { fontStyle: 'italic' }]}>📝 {rec.note}</Text>}
            </View>

            {/* Actions */}
            {!open && (
              <View style={[styles.row, { gap: 8, marginTop: 12 }]}>
                {paid ? (
                  <Button small variant="outline" icon="arrow-undo-outline" title={t('Mark unpaid')} style={{ flex: 1 }}
                    onPress={() => confirmAction(t('Mark salary as unpaid'), `${teacher!.name} — ${formatMonth(rec.month)}`, () => updateSalary(rec.id, { status: 'unpaid' }))} />
                ) : (
                  <Button small variant="success" icon="cash-outline" title={t('Pay')} style={{ flex: 1 }}
                    onPress={() => confirmAction(t('Mark salary as paid'), `${teacher!.name} — ${money(netSalary(rec))} (${formatMonth(rec.month)})`, () => markSalaryPaid(rec.id))} />
                )}
                <Button small variant="outline" icon="create-outline" title={t('Edit')} style={{ flex: 1 }} onPress={() => startEdit(rec)} />
                <IconButton icon="document-text-outline" color={colors.primary} label={`${t('Payslip')}: ${teacher!.name}`} onPress={() => payslip(rec)} />
              </View>
            )}

            {/* Edit panel */}
            {open && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={[styles.row, { gap: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <Input label={t('Basic (Rs)')} value={draft.amount} keyboardType="number-pad" onChangeText={(v) => setDraft({ ...draft, amount: digits(v) })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label={t('Bonus (Rs)')} value={draft.bonus} placeholder="0" keyboardType="number-pad" onChangeText={(v) => setDraft({ ...draft, bonus: digits(v) })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label={t('Deduction (Rs)')} value={draft.deduction} placeholder="0" keyboardType="number-pad" onChangeText={(v) => setDraft({ ...draft, deduction: digits(v) })} />
                  </View>
                </View>
                <Input label={t('Note (optional)')} value={draft.note} onChangeText={(note) => setDraft({ ...draft, note })}
                  placeholder={t('e.g. Eid bonus, 2 days leave deduction')} />
                <Text style={[styles.label, { marginBottom: 8 }]}>{t('Status')}</Text>
                <Segmented<PayStatus>
                  value={draft.status}
                  onChange={(status) => setDraft({ ...draft, status })}
                  options={[{ label: t('Unpaid'), value: 'unpaid', icon: 'time-outline' }, { label: t('Paid'), value: 'paid', icon: 'checkmark-circle-outline' }]}
                />
                {draft.status === 'paid' && (
                  <View style={{ marginTop: 12 }}>
                    <Input label={t('Paid on (YYYY-MM-DD)')} value={draft.paidOn} onChangeText={(paidOn) => setDraft({ ...draft, paidOn })} />
                  </View>
                )}
                <View style={[styles.row, { justifyContent: 'space-between', marginVertical: 10 }]}>
                  <Text style={styles.listTitle}>{t('Net salary')}</Text>
                  <Text style={[styles.listTitle, { fontSize: 17, color: colors.primary }]}>
                    {money(netSalary({ amount: Number(draft.amount || 0), bonus: Number(draft.bonus || 0), deduction: Number(draft.deduction || 0) }))}
                  </Text>
                </View>
                <View style={[styles.row, { gap: 8 }]}>
                  <Button small title={t('Save')} icon="checkmark" style={{ flex: 1 }} onPress={() => saveEdit(rec)} />
                  <Button small variant="outline" title={t('Cancel')} style={{ flex: 1 }} onPress={() => setEditing(null)} />
                </View>
              </View>
            )}
          </Card>
        );
      })}
      <Text style={[styles.muted, { textAlign: 'center', marginVertical: 8 }]}>{t('Tap a teacher\'s name to edit their details and basic salary.')}</Text>
    </Screen>
  );
}
