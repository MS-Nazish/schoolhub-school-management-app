import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';

import { colors, radius } from '@/components/theme';
import { Banner, Button, Card, IconButton, Screen, styles } from '@/components/ui';
import { classFeeItems, feeItemsTotal, useStore } from '@/data/store';
import type { FeeItem } from '@/data/types';
import { t } from '@/lib/i18n';
import { formatMonth, money, notify, thisMonth } from '@/lib/utils';

type Row = { name: string; amount: string };

const COMMON_HEADS = ['Tuition fee', 'Computer lab', 'Science lab', 'Library', 'Sports', 'Exam fee', 'Transport', 'Stationery'];

/** Monthly fee heads for every class, each editable */
export default function FeeStructure() {
  const params = useLocalSearchParams<{ class?: string }>();
  const { data, setClassFeeItems } = useStore();
  const [editing, setEditing] = useState<string | null>(params.class ?? null);
  const [rows, setRows] = useState<Row[]>(() => {
    const cls = data.classes.find((c) => c.id === params.class);
    return cls ? classFeeItems(cls).map((i) => ({ name: i.name, amount: String(i.amount) })) : [];
  });
  const [applyNow, setApplyNow] = useState(true);

  const startEdit = (classId: string) => {
    const cls = data.classes.find((c) => c.id === classId);
    setRows(classFeeItems(cls).map((i) => ({ name: i.name, amount: String(i.amount) })));
    setApplyNow(true);
    setEditing(classId);
  };

  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const draftTotal = rows.reduce((n, r) => n + (Number(r.amount) || 0), 0);

  const save = (classId: string) => {
    const items: FeeItem[] = [];
    for (const r of rows) {
      if (!r.name.trim() && !r.amount) continue;
      if (!r.name.trim()) return notify(t('Missing details'), t('Every fee head needs a name.'));
      const amount = Number(r.amount);
      if (!amount || amount <= 0) return notify(t('Invalid amount'), t('{name}: enter the amount in rupees.', { name: r.name.trim() }));
      items.push({ name: r.name.trim(), amount });
    }
    if (!items.length) return notify(t('Missing details'), t('Add at least one fee head.'));
    setClassFeeItems(classId, items, applyNow ? thisMonth() : undefined);
    setEditing(null);
    notify(t('Fee structure saved'), t('Monthly fee is now {amount}.', { amount: money(feeItemsTotal(items)) }));
  };

  return (
    <Screen>
      <Banner icon="information-circle-outline" color={colors.info} soft={colors.infoSoft}
        text={t('Each class has its own monthly fee heads. New vouchers use this structure.')} />

      {data.classes.map((c) => {
        const items = classFeeItems(c);
        const open = editing === c.id;
        const unpaidNow = data.fees.filter((f) => f.month === thisMonth() && f.status === 'unpaid'
          && data.students.some((s) => s.id === f.studentId && s.classId === c.id)).length;

        return (
          <Card key={c.id}>
            <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
              <Text style={[styles.listTitle, { fontSize: 17 }]}>{c.name}</Text>
              {!open && <Button small variant="ghost" icon="create-outline" title={t('Edit')} onPress={() => startEdit(c.id)} />}
            </View>

            {!open ? (
              <>
                {items.map((i) => (
                  <View key={i.name} style={[styles.row, { justifyContent: 'space-between', paddingVertical: 6 }]}>
                    <Text style={styles.body}>{t(i.name)}</Text>
                    <Text style={styles.body}>{money(i.amount)}</Text>
                  </View>
                ))}
                <View style={[styles.row, { justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Text style={styles.listTitle}>{t('Monthly total')}</Text>
                  <Text style={[styles.listTitle, { fontSize: 17, color: colors.primary }]}>{money(feeItemsTotal(items))}</Text>
                </View>
              </>
            ) : (
              <>
                {rows.map((r, i) => (
                  <View key={i} style={[styles.row, { gap: 8, marginBottom: 8 }]}>
                    <TextInput value={r.name} onChangeText={(name) => setRow(i, { name })} placeholder={t('Fee head')}
                      placeholderTextColor={colors.muted} style={[styles.input, { flex: 1 }]} accessibilityLabel={`${t('Fee head')} ${i + 1}`} />
                    <TextInput value={r.amount} onChangeText={(v) => setRow(i, { amount: v.replace(/[^0-9]/g, '') })} placeholder="Rs"
                      keyboardType="number-pad" placeholderTextColor={colors.muted} style={[styles.input, { width: 96, textAlign: 'right' }]}
                      accessibilityLabel={`${t('Amount')} ${i + 1}`} />
                    <IconButton icon="close-circle" color={colors.danger} label={`${t('Remove')} ${r.name}`}
                      onPress={() => setRows((rs) => rs.filter((_, j) => j !== i))} />
                  </View>
                ))}

                <Text style={[styles.muted, { marginTop: 4, marginBottom: 6 }]}>{t('Quick add')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {COMMON_HEADS.filter((h) => !rows.some((r) => r.name === h)).map((h) => (
                    <Pressable key={h} onPress={() => setRows((rs) => [...rs, { name: h, amount: '' }])}
                      style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
                      <Text style={{ color: colors.text, fontSize: 13 }}>+ {t(h)}</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => setRows((rs) => [...rs, { name: '', amount: '' }])}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.accent }}>
                    <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>+ {t('Other')}</Text>
                  </Pressable>
                </View>

                <View style={[styles.row, { justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Text style={styles.listTitle}>{t('Monthly total')}</Text>
                  <Text style={[styles.listTitle, { fontSize: 17, color: colors.primary }]}>{money(draftTotal)}</Text>
                </View>

                {unpaidNow > 0 && (
                  <View style={[styles.row, { gap: 10, marginBottom: 12, padding: 10, borderRadius: radius.md, backgroundColor: colors.bg }]}>
                    <Text style={[styles.body, { flex: 1 }]}>
                      {t('Also update the {n} unpaid vouchers for {month}', { n: unpaidNow, month: formatMonth(thisMonth()) })}
                    </Text>
                    <Switch value={applyNow} onValueChange={setApplyNow} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#fff" />
                  </View>
                )}

                <View style={[styles.row, { gap: 8 }]}>
                  <Button small title={t('Save')} icon="checkmark" style={{ flex: 1 }} onPress={() => save(c.id)} />
                  <Button small variant="outline" title={t('Cancel')} style={{ flex: 1 }} onPress={() => setEditing(null)} />
                </View>
              </>
            )}
          </Card>
        );
      })}
      <Text style={[styles.muted, { textAlign: 'center', marginBottom: 8 }]}>{t('Paid vouchers are never changed.')}</Text>
    </Screen>
  );
}
