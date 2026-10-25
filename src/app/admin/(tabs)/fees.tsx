import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { DateInput, dmyToIso, isoToDmy } from '@/components/DateInput';
import { colors } from '@/components/theme';
import {
  Avatar, Badge, Button, Card, Chips, EmptyState, IconButton, Input, ProgressBar, Screen, Segmented, SectionTitle, StatCard, StatGrid, styles,
} from '@/components/ui';
import { classFeeItems, feeItemsTotal, netFee, useStore } from '@/data/store';
import type { FeeRecord, PayStatus, SchoolData } from '@/data/types';
import { t } from '@/lib/i18n';
import { shareFeeReceipt } from '@/lib/receipt';
import { confirmAction, formatMonth, money, nextMonth, notify, thisMonth, today } from '@/lib/utils';

type Filter = 'all' | PayStatus;
type Draft = { discount: string; fine: string; note: string; status: PayStatus; paidOn: string };

const digits = (v: string) => v.replace(/[^0-9]/g, '');

/** Fee totals for a month (net of discounts and fines), optionally for one class */
function feeStats(data: SchoolData, month: string, classId?: string) {
  const inClass = new Set(data.students.filter((s) => !classId || s.classId === classId).map((s) => s.id));
  const fees = data.fees.filter((f) => f.month === month && inClass.has(f.studentId));
  const paid = fees.filter((f) => f.status === 'paid');
  const collected = paid.reduce((n, f) => n + netFee(f), 0);
  const due = fees.reduce((n, f) => n + netFee(f), 0);
  return {
    students: inClass.size,
    vouchers: fees.length,
    paidCount: paid.length,
    unpaidCount: fees.length - paid.length,
    due,
    collected,
    remaining: due - collected,
    discounts: fees.reduce((n, f) => n + (f.discount ?? 0), 0),
    fines: fees.reduce((n, f) => n + (f.fine ?? 0), 0),
    pct: due ? Math.round((collected / due) * 100) : 0,
  };
}

const pctColor = (pct: number) => (pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.danger);

export default function Fees() {
  const { data, generateFees, markFeePaid, markFeeUnpaid, sendFeeReminders, updateFee } = useStore();
  const months = [...new Set(data.fees.map((f) => f.month))].sort().reverse();
  const [pickedMonth, setMonth] = useState('');
  // Default to this month (or the latest one); the page can open before the data has loaded
  const month = months.includes(pickedMonth) ? pickedMonth : months.includes(thisMonth()) ? thisMonth() : months[0] ?? thisMonth();
  const [classId, setClassId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

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

  const startEdit = (fee: FeeRecord) => {
    setEditing(fee.id);
    setDraft({
      discount: fee.discount ? String(fee.discount) : '', fine: fee.fine ? String(fee.fine) : '', note: fee.note ?? '',
      status: fee.status, paidOn: isoToDmy(fee.paidOn ?? today()),
    });
  };

  const saveEdit = (fee: FeeRecord) => {
    if (!draft) return;
    const discount = Number(draft.discount || 0);
    const fine = Number(draft.fine || 0);
    if (discount > fee.amount + fine) return notify(t('Invalid discount'), t('The discount cannot be more than the fee.'));
    const paidOn = draft.status === 'paid' ? dmyToIso(draft.paidOn) : undefined;
    if (draft.status === 'paid' && !paidOn) return notify(t('Invalid date'), t('Enter the paid date as DD-MM-YYYY.'));
    updateFee(fee.id, {
      discount: discount || undefined, fine: fine || undefined, note: draft.note.trim() || undefined,
      status: draft.status, paidOn: paidOn ?? undefined,
    });
    setEditing(null);
  };

  const monthChips = <Chips options={months.map((m) => ({ label: formatMonth(m), value: m }))} value={month} onChange={(m) => { setMonth(m); setEditing(null); }} />;

  // ---------- One class: fee structure, every student's voucher, then the class totals ----------
  if (cls) {
    const s = feeStats(data, month, cls.id);
    const items = classFeeItems(cls);
    const rows = data.students
      .filter((st) => st.classId === cls.id)
      .sort((a, b) => a.rollNo - b.rollNo)
      .map((st) => ({ student: st, fee: data.fees.find((f) => f.id === `${st.id}_${month}`) }))
      .filter((r) => filter === 'all' || r.fee?.status === filter);

    return (
      <Screen>
        <Pressable onPress={() => { setClassId(null); setFilter('all'); setEditing(null); }} style={[styles.row, { gap: 6, marginBottom: 10 }]}>
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('All classes')}</Text>
        </Pressable>
        <Text style={[styles.h1, { marginBottom: 10 }]}>{cls.name}</Text>
        {monthChips}

        <Card>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
            <Text style={styles.listTitle}>{t('Fee structure')}</Text>
            <Button small variant="ghost" icon="create-outline" title={t('Edit')} onPress={() => router.push(`/admin/fee-structure?class=${cls.id}`)} />
          </View>
          {items.map((i) => (
            <View key={i.name} style={[styles.row, { justifyContent: 'space-between', paddingVertical: 3 }]}>
              <Text style={styles.muted}>{t(i.name)}</Text>
              <Text style={styles.body}>{money(i.amount)}</Text>
            </View>
          ))}
          <View style={[styles.row, { justifyContent: 'space-between', paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={styles.listTitle}>{t('Monthly total')}</Text>
            <Text style={[styles.listTitle, { color: colors.primary }]}>{money(feeItemsTotal(items))}</Text>
          </View>
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

        {rows.length === 0 && <Card><EmptyState icon="wallet-outline" text={t('No fee records')} /></Card>}
        {rows.map(({ student, fee }) => {
          const paid = fee?.status === 'paid';
          const open = !!fee && editing === fee.id && draft;
          return (
            <Card key={student.id} style={{ borderLeftWidth: 4, borderLeftColor: !fee ? colors.border : paid ? colors.success : colors.danger, paddingVertical: 12 }}>
              <View style={styles.row}>
                <Avatar name={student.name} size={36} photo={student.photo} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.listTitle}>{student.rollNo}. {student.name}</Text>
                  <Text style={styles.muted}>
                    {fee ? `${money(netFee(fee))}${fee.paidOn ? ` · ${t('Paid on')} ${fee.paidOn}` : ''}` : t('No voucher for this month')}
                  </Text>
                </View>
                {fee && (paid ? (
                  <View style={[styles.row, { gap: 2 }]}>
                    <Badge text={`✓ ${t('Paid')}`} color={colors.success} soft={colors.successSoft} />
                    <IconButton icon="receipt-outline" color={colors.primary} label={`${t('Fee receipt')}: ${student.name}`} onPress={() => receipt(fee)} />
                  </View>
                ) : (
                  <Button small title={t('Mark paid')} onPress={() =>
                    confirmAction(t('Mark as paid'), `${student.name} — ${money(netFee(fee))}`, () => markFeePaid(fee.id))} />
                ))}
                {fee && !open && (
                  <IconButton icon="create-outline" color={colors.primary} label={`${t('Edit voucher')}: ${student.name}`} onPress={() => startEdit(fee)} />
                )}
              </View>

              {/* Discount / fine / note shown on the voucher */}
              {fee && !open && (!!fee.discount || !!fee.fine || !!fee.note) && (
                <View style={{ marginTop: 8, marginLeft: 46, gap: 2 }}>
                  {!!fee.discount && <Text style={[styles.muted, { color: colors.success }]}>− {money(fee.discount)} {t('discount')}</Text>}
                  {!!fee.fine && <Text style={[styles.muted, { color: colors.danger }]}>+ {money(fee.fine)} {t('late fine')}</Text>}
                  {!!fee.note && <Text style={[styles.muted, { fontStyle: 'italic' }]}>📝 {fee.note}</Text>}
                </View>
              )}

              {/* Voucher edit panel */}
              {fee && open && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  {(fee.items ?? [{ name: 'Tuition fee', amount: fee.amount }]).map((i) => (
                    <View key={i.name} style={[styles.row, { justifyContent: 'space-between', paddingVertical: 2 }]}>
                      <Text style={styles.muted}>{t(i.name)}</Text>
                      <Text style={styles.body}>{money(i.amount)}</Text>
                    </View>
                  ))}
                  <View style={[styles.row, { gap: 8, marginTop: 10 }]}>
                    <View style={{ flex: 1 }}>
                      <Input label={t('Discount (Rs)')} value={draft.discount} placeholder="0" keyboardType="number-pad"
                        onChangeText={(v) => setDraft({ ...draft, discount: digits(v) })} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input label={t('Late fine (Rs)')} value={draft.fine} placeholder="0" keyboardType="number-pad"
                        onChangeText={(v) => setDraft({ ...draft, fine: digits(v) })} />
                    </View>
                  </View>
                  <Input label={t('Note (optional)')} value={draft.note} onChangeText={(note) => setDraft({ ...draft, note })}
                    placeholder={t('e.g. Sibling discount, paid in cash')} />
                  <Text style={[styles.label, { marginBottom: 8 }]}>{t('Status')}</Text>
                  <Segmented<PayStatus>
                    value={draft.status}
                    onChange={(status) => setDraft({ ...draft, status })}
                    options={[{ label: t('Unpaid'), value: 'unpaid', icon: 'time-outline' }, { label: t('Paid'), value: 'paid', icon: 'checkmark-circle-outline' }]}
                  />
                  {draft.status === 'paid' && (
                    <View style={{ marginTop: 12 }}>
                      <DateInput label={t('Paid on')} value={draft.paidOn} onChange={(paidOn) => setDraft({ ...draft, paidOn })} />
                    </View>
                  )}
                  <View style={[styles.row, { justifyContent: 'space-between', marginVertical: 10 }]}>
                    <Text style={styles.listTitle}>{t('Amount to pay')}</Text>
                    <Text style={[styles.listTitle, { fontSize: 17, color: colors.primary }]}>
                      {money(netFee({ amount: fee.amount, discount: Number(draft.discount || 0), fine: Number(draft.fine || 0) }))}
                    </Text>
                  </View>
                  <View style={[styles.row, { gap: 8 }]}>
                    <Button small title={t('Save')} icon="checkmark" style={{ flex: 1 }} onPress={() => saveEdit(fee)} />
                    <Button small variant="outline" title={t('Cancel')} style={{ flex: 1 }} onPress={() => setEditing(null)} />
                  </View>
                  {paid && (
                    <Button small variant="ghost" icon="arrow-undo-outline" title={t('Mark as unpaid')} style={{ marginTop: 6 }}
                      onPress={() => confirmAction(t('Mark as unpaid'), `${student.name} — ${money(netFee(fee))}`, () => { markFeeUnpaid(fee.id); setEditing(null); })} />
                  )}
                </View>
              )}
            </Card>
          );
        })}

        <SectionTitle title={`${t('Class summary')} · ${formatMonth(month)}`} />
        <Card>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={styles.listTitle}>{t('Collected')}</Text>
            <Text style={[styles.listTitle, { color: pctColor(s.pct) }]}>{s.pct}%</Text>
          </View>
          <ProgressBar pct={s.pct} color={pctColor(s.pct)} />
          <View style={{ marginTop: 10 }}>
            {([
              [t('Students'), String(s.students), undefined],
              [t('Total fee due'), money(s.due), undefined],
              ...(s.discounts ? [[t('Discounts given'), `− ${money(s.discounts)}`, colors.muted]] : []),
              ...(s.fines ? [[t('Late fines'), `+ ${money(s.fines)}`, colors.muted]] : []),
              [`${t('Collected')} (${s.paidCount})`, money(s.collected), colors.success],
              [`${t('Remaining')} (${s.unpaidCount})`, money(s.remaining), s.remaining ? colors.danger : colors.success],
            ] as [string, string, string | undefined][]).map(([label, value, color], i) => (
              <View key={label} style={[styles.row, { justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }]}>
                <Text style={styles.body}>{label}</Text>
                <Text style={[styles.listTitle, color ? { color } : null]}>{value}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.muted, { fontSize: 12, marginTop: 4 }]}>{t('Totals are after discounts and late fines.')}</Text>
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

      <SectionTitle title={t('Classes')}
        right={<Button small variant="ghost" icon="list-outline" title={t('Fee structure')} onPress={() => router.push('/admin/fee-structure')} />} />
      {data.classes.map((c) => {
        const s = feeStats(data, month, c.id);
        return (
          <Pressable key={c.id} onPress={() => { setClassId(c.id); setFilter('all'); }}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <View>
                <Text style={[styles.listTitle, { fontSize: 17 }]}>{c.name}</Text>
                <Text style={styles.muted}>{t('Monthly fee')} {money(feeItemsTotal(classFeeItems(c)))} · {s.students} {t('students')}</Text>
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
