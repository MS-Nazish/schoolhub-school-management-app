import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { colors, radius } from '@/components/theme';
import {
  Avatar, Badge, Button, Card, Chips, EmptyState, IconButton, ListItem, ProgressBar, Screen, SectionTitle, StatCard, StatGrid, styles,
} from '@/components/ui';
import { MONTHLY_FEE } from '@/data/seed';
import { useStore } from '@/data/store';
import type { FeeRecord, PayStatus, SchoolData } from '@/data/types';
import { t } from '@/lib/i18n';
import { shareFeeReceipt } from '@/lib/receipt';
import { confirmAction, formatMonth, money, nextMonth, notify, thisMonth } from '@/lib/utils';

type Filter = 'all' | PayStatus;

/** Fee totals for a month, optionally for one class */
function feeStats(data: SchoolData, month: string, classId?: string) {
  const inClass = new Set(data.students.filter((s) => !classId || s.classId === classId).map((s) => s.id));
  const fees = data.fees.filter((f) => f.month === month && inClass.has(f.studentId));
  const paid = fees.filter((f) => f.status === 'paid');
  const collected = paid.reduce((n, f) => n + f.amount, 0);
  const due = fees.reduce((n, f) => n + f.amount, 0);
  return {
    students: inClass.size,
    vouchers: fees.length,
    paidCount: paid.length,
    unpaidCount: fees.length - paid.length,
    due,
    collected,
    remaining: due - collected,
    pct: due ? Math.round((collected / due) * 100) : 0,
  };
}

const pctColor = (pct: number) => (pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.danger);

export default function Fees() {
  const { data, generateFees, markFeePaid, markFeeUnpaid, sendFeeReminders, setClassFee } = useStore();
  const months = [...new Set(data.fees.map((f) => f.month))].sort().reverse();
  const [month, setMonth] = useState(months.includes(thisMonth()) ? thisMonth() : months[0] ?? thisMonth());
  const [classId, setClassId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [editingFee, setEditingFee] = useState(false);
  const [feeInput, setFeeInput] = useState('');

  const upcoming = nextMonth(months[0] ?? thisMonth());
  const cls = data.classes.find((c) => c.id === classId);

  const remind = (cid?: string) => {
    const s = feeStats(data, month, cid);
    if (!s.unpaidCount) return notify(t('Nothing to remind'), t('Everyone has paid for this month.'));
    confirmAction(t('Send fee reminder'), t('Remind {n} parent(s) with unpaid fees for {month}?', { n: s.unpaidCount, month: formatMonth(month) }), () => {
      const n = sendFeeReminders(month, cid);
      notify(t('Reminders sent'), t('{n} parent(s) have been notified.', { n }));
    });
  };

  const receipt = async (fee: FeeRecord) => {
    try {
      await shareFeeReceipt(data, fee);
    } catch (e) {
      notify(t('Could not create PDF'), e instanceof Error ? e.message : String(e));
    }
  };

  const monthChips = <Chips options={months.map((m) => ({ label: formatMonth(m), value: m }))} value={month} onChange={setMonth} />;

  // ---------- One class: every student's fee, then the class totals ----------
  if (cls) {
    const s = feeStats(data, month, cls.id);
    const rows = data.students
      .filter((st) => st.classId === cls.id)
      .sort((a, b) => a.rollNo - b.rollNo)
      .map((st) => ({ student: st, fee: data.fees.find((f) => f.id === `${st.id}_${month}`) }))
      .filter((r) => filter === 'all' || r.fee?.status === filter);
    const classFee = cls.monthlyFee ?? MONTHLY_FEE;

    const saveFee = () => {
      const n = Number(feeInput);
      if (!n || n <= 0) return notify(t('Invalid amount'), t('Enter the monthly fee in rupees.'));
      setClassFee(cls.id, n);
      setEditingFee(false);
      notify(t('Fee updated'), t('New vouchers for {cls} will be {amount}. Existing vouchers are not changed.', { cls: cls.name, amount: money(n) }));
    };

    return (
      <Screen>
        <Pressable onPress={() => { setClassId(null); setFilter('all'); setEditingFee(false); }} style={[styles.row, { gap: 6, marginBottom: 10 }]}>
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('All classes')}</Text>
        </Pressable>
        <Text style={[styles.h1, { marginBottom: 10 }]}>{cls.name}</Text>
        {monthChips}

        <Card style={{ paddingVertical: 12 }}>
          {editingFee ? (
            <View style={[styles.row, { gap: 8 }]}>
              <Text style={[styles.body, { flex: 1 }]}>{t('Monthly fee (Rs)')}</Text>
              <TextInput value={feeInput} onChangeText={(v) => setFeeInput(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" autoFocus
                style={{ width: 90, textAlign: 'center', borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.sm, paddingVertical: 6, color: colors.text, fontWeight: '700', backgroundColor: colors.input }} />
              <Button small title={t('Save')} onPress={saveFee} />
              <IconButton icon="close" label={t('Cancel')} onPress={() => setEditingFee(false)} />
            </View>
          ) : (
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text style={styles.body}>{t('Monthly fee')}: <Text style={{ fontWeight: '800' }}>{money(classFee)}</Text></Text>
              <Button small variant="ghost" icon="create-outline" title={t('Change')} onPress={() => { setFeeInput(String(classFee)); setEditingFee(true); }} />
            </View>
          )}
        </Card>

        <Chips<Filter>
          options={[
            { label: `${t('All')} (${s.vouchers})`, value: 'all' },
            { label: `${t('Unpaid')} (${s.unpaidCount})`, value: 'unpaid' },
            { label: `${t('Paid')} (${s.paidCount})`, value: 'paid' },
          ]}
          value={filter}
          onChange={setFilter}
        />

        <Card style={{ paddingVertical: 4 }}>
          {rows.length === 0 && <EmptyState icon="wallet-outline" text={t('No fee records')} />}
          {rows.map(({ student, fee }, i) => (
            <ListItem
              key={student.id}
              last={i === rows.length - 1}
              left={<Avatar name={student.name} size={36} photo={student.photo} />}
              title={`${student.rollNo}. ${student.name}`}
              subtitle={fee
                ? `${money(fee.amount)}${fee.paidOn ? ` · ${t('Paid on')} ${fee.paidOn}` : ''}`
                : t('No voucher for this month')}
              right={!fee ? undefined : fee.status === 'paid' ? (
                <View style={[styles.row, { gap: 2 }]}>
                  <Badge text={`✓ ${t('Paid')}`} color={colors.success} soft={colors.successSoft} />
                  <IconButton icon="receipt-outline" color={colors.primary} label={`${t('Fee receipt')}: ${student.name}`} onPress={() => receipt(fee)} />
                  <IconButton icon="arrow-undo-outline" label={`${t('Mark as unpaid')}: ${student.name}`} onPress={() =>
                    confirmAction(t('Mark as unpaid'), `${student.name} — ${money(fee.amount)}`, () => markFeeUnpaid(fee.id))} />
                </View>
              ) : (
                <Button small title={t('Mark paid')} onPress={() =>
                  confirmAction(t('Mark as paid'), `${student.name} — ${money(fee.amount)}`, () => markFeePaid(fee.id))} />
              )}
            />
          ))}
        </Card>

        <SectionTitle title={`${t('Class summary')} · ${formatMonth(month)}`} />
        <Card>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={styles.listTitle}>{t('Collected')}</Text>
            <Text style={[styles.listTitle, { color: pctColor(s.pct) }]}>{s.pct}%</Text>
          </View>
          <ProgressBar pct={s.pct} color={pctColor(s.pct)} />
          <View style={{ marginTop: 10 }}>
            {[
              [t('Students'), String(s.students)],
              [t('Total fee due'), money(s.due)],
              [`${t('Collected')} (${s.paidCount})`, money(s.collected)],
              [`${t('Remaining')} (${s.unpaidCount})`, money(s.remaining)],
            ].map(([label, value], i) => (
              <View key={label} style={[styles.row, { justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }]}>
                <Text style={styles.body}>{label}</Text>
                <Text style={[styles.listTitle, i === 2 && { color: colors.success }, i === 3 && { color: s.remaining ? colors.danger : colors.success }]}>{value}</Text>
              </View>
            ))}
          </View>
        </Card>
        <Button variant="outline" icon="megaphone-outline" title={`${t('Remind unpaid parents')} (${s.unpaidCount})`}
          onPress={() => remind(cls.id)} disabled={!s.unpaidCount} style={{ marginBottom: 8 }} />
      </Screen>
    );
  }

  // ---------- Overview: whole school, then one card per class ----------
  const all = feeStats(data, month);
  return (
    <Screen>
      {monthChips}

      <StatGrid>
        <StatCard icon="checkmark-circle" label={`${t('Collected')} (${all.paidCount})`} value={money(all.collected)} color={colors.success} soft={colors.successSoft} />
        <StatCard icon="time" label={`${t('Remaining')} (${all.unpaidCount})`} value={money(all.remaining)} color={colors.danger} soft={colors.dangerSoft} />
      </StatGrid>
      <Card>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={styles.listTitle}>{t('All classes')} · {money(all.due)}</Text>
          <Text style={[styles.listTitle, { color: pctColor(all.pct) }]}>{all.pct}%</Text>
        </View>
        <ProgressBar pct={all.pct} color={pctColor(all.pct)} />
      </Card>

      <SectionTitle title={t('Classes')} />
      {data.classes.map((c) => {
        const s = feeStats(data, month, c.id);
        return (
          <Pressable key={c.id} onPress={() => { setClassId(c.id); setFilter('all'); }}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <View>
                <Text style={[styles.listTitle, { fontSize: 17 }]}>{c.name}</Text>
                <Text style={styles.muted}>{t('Monthly fee')} {money(c.monthlyFee ?? MONTHLY_FEE)} · {s.students} {t('students')}</Text>
              </View>
              <View style={[styles.row, { gap: 6 }]}>
                <Badge text={`${s.paidCount}/${s.vouchers} ${t('paid')}`} color={pctColor(s.pct)} soft={colors.bg} />
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </View>
            </View>
            <ProgressBar pct={s.pct} color={pctColor(s.pct)} />
            <View style={[styles.row, { justifyContent: 'space-between', marginTop: 8 }]}>
              <Text style={[styles.muted, { color: colors.success }]}>{t('Collected')} {money(s.collected)}</Text>
              <Text style={[styles.muted, { color: s.remaining ? colors.danger : colors.success }]}>{t('Remaining')} {money(s.remaining)}</Text>
            </View>
          </Pressable>
        );
      })}

      <Button variant="outline" icon="megaphone-outline" title={`${t('Remind all unpaid parents')} (${all.unpaidCount})`}
        onPress={() => remind()} disabled={!all.unpaidCount} style={{ marginBottom: 10 }} />
      <Button variant="outline" icon="add-circle-outline" title={`${t('Generate')} ${formatMonth(upcoming)}`}
        onPress={() => confirmAction(t('Generate fees'), `${formatMonth(upcoming)}: ${t('create fee vouchers for all students?')}`, () => {
          const n = generateFees(upcoming);
          setMonth(upcoming);
          notify(t('Fees generated'), `${n} ${t('vouchers created. Parents have been notified.')}`);
        })} style={{ marginBottom: 8 }} />
    </Screen>
  );
}
