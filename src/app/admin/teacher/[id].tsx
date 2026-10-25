import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { TeacherForm, type TeacherFormValues, validateTeacher } from '@/components/TeacherForm';
import { colors } from '@/components/theme';
import { Avatar, Badge, Button, Card, EmptyState, Screen, SectionTitle, styles } from '@/components/ui';
import { netSalary, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { confirmAction, formatMonth, money, notify, thisMonth } from '@/lib/utils';

export default function EditTeacher() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loaded, updateTeacher, updateSalary, deleteTeacher } = useStore();
  const teacher = data.users.find((u) => u.id === id && u.role === 'teacher');
  const [form, setForm] = useState<TeacherFormValues | null>(null);
  const [applyToMonth, setApplyToMonth] = useState(true);

  // Fill the form once the teacher is available (the page can open before the data has loaded)
  useEffect(() => {
    if (form || !teacher) return;
    setForm({
      name: teacher.name, email: teacher.email, phone: teacher.phone ?? '', salary: String(teacher.salary ?? ''),
      subject: teacher.subject ?? '', classIds: teacher.classIds ?? [],
    });
  }, [form, teacher]);

  if (!teacher || !form) return <Screen>{loaded && !teacher ? <EmptyState text={t('Teacher not found')} /> : null}</Screen>;

  const records = data.salaries.filter((s) => s.teacherId === teacher.id).sort((a, b) => b.month.localeCompare(a.month));
  const current = records.find((r) => r.month === thisMonth());
  const salaryChanged = Number(form.salary) !== (teacher.salary ?? 0);

  const save = () => {
    const err = validateTeacher(form);
    if (err) return notify(t('Missing details'), err);
    const salary = Number(form.salary);
    updateTeacher(teacher.id, {
      name: form.name.trim(), phone: form.phone.trim(), subject: form.subject, classIds: form.classIds, salary,
    });
    // The new basic salary can also replace this month's not-yet-paid amount
    if (salaryChanged && applyToMonth && current?.status === 'unpaid') updateSalary(current.id, { amount: salary });
    notify(t('Teacher updated'), t('{name} has been saved.', { name: form.name.trim() }));
    router.back();
  };

  return (
    <Screen>
      <Card style={[styles.row, { backgroundColor: colors.header }]}>
        <Avatar name={form.name || teacher.name} size={52} color={colors.info} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{form.name || teacher.name}</Text>
          <Text style={{ color: '#C7D2FE' }}>{t(form.subject)} {t('Teacher')}</Text>
        </View>
      </Card>

      <SectionTitle title={t('Teacher details')} />
      <Card>
        <TeacherForm value={form} onChange={setForm} emailLocked />
        {salaryChanged && current?.status === 'unpaid' && (
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 14, gap: 10 }]}>
            <Text style={[styles.body, { flex: 1 }]}>
              {t('Also change the unpaid salary for {month} to {amount}', { month: formatMonth(current.month), amount: money(Number(form.salary) || 0) })}
            </Text>
            <Switch value={applyToMonth} onValueChange={setApplyToMonth} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#fff" />
          </View>
        )}
        <Button title={t('Save changes')} icon="checkmark" onPress={save} />
      </Card>

      <SectionTitle title={t('Salary history')} right={<Button small variant="ghost" title={t('Salaries')} onPress={() => router.push('/admin/salaries')} />} />
      <Card style={{ paddingVertical: 4 }}>
        {records.length === 0 && <EmptyState icon="cash-outline" text={t('No salary records')} />}
        {records.map((r, i) => (
          <View key={r.id} style={[styles.row, { justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }]}>
            <View>
              <Text style={styles.listTitle}>{formatMonth(r.month)}</Text>
              <Text style={styles.muted}>{money(netSalary(r))}{r.paidOn ? ` · ${t('Paid on')} ${r.paidOn}` : ''}</Text>
            </View>
            <Badge text={t(r.status === 'paid' ? 'Paid' : 'Unpaid')}
              color={r.status === 'paid' ? colors.success : colors.danger} soft={r.status === 'paid' ? colors.successSoft : colors.dangerSoft} />
          </View>
        ))}
      </Card>

      <Button variant="danger" icon="trash-outline" title={t('Delete teacher')} style={{ marginTop: 6, marginBottom: 8 }}
        onPress={() => confirmAction(t('Delete teacher'), `${t('Remove')} ${teacher.name}?`, () => {
          deleteTeacher(teacher.id);
          router.back();
        })} />
    </Screen>
  );
}
