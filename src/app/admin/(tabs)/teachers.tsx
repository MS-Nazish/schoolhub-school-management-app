import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { Avatar, Badge, Button, Card, Chips, EmptyState, IconButton, Input, ListItem, Screen, SectionTitle, styles } from '@/components/ui';
import { DEFAULT_SALARY, SUBJECTS } from '@/data/seed';
import { className, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { confirmAction, money, notify } from '@/lib/utils';

export default function Teachers() {
  const { data, addTeacher, updateTeacher, deleteTeacher, addClass } = useStore();
  const teachers = data.users.filter((u) => u.role === 'teacher');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', salary: String(DEFAULT_SALARY), subject: SUBJECTS[0]!, classIds: [] as string[] });
  const [newClass, setNewClass] = useState('');
  const [editingSalary, setEditingSalary] = useState<string | null>(null);
  const [salaryInput, setSalaryInput] = useState('');

  const toggleClass = (id: string) =>
    setForm({ ...form, classIds: form.classIds.includes(id) ? form.classIds.filter((c) => c !== id) : [...form.classIds, id] });

  const save = () => {
    if (!form.name.trim() || !form.email.trim()) return notify(t('Missing details'), t('Name and email are required.'));
    if (data.users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase())) {
      return notify(t('Email in use'), t('Another account already uses this email.'));
    }
    if (!form.classIds.length) return notify(t('Assign classes'), t('Select at least one class.'));
    const salary = Number(form.salary);
    if (!salary || salary < 0) return notify(t('Invalid salary'), t('Enter the monthly salary in rupees.'));
    addTeacher({ ...form, salary, name: form.name.trim(), email: form.email.trim() });
    notify(t('Teacher added'), `${t('Login')}: ${form.email.trim()} / teacher123`);
    setForm({ name: '', email: '', phone: '', salary: String(DEFAULT_SALARY), subject: SUBJECTS[0]!, classIds: [] });
    setShowForm(false);
  };

  const saveSalary = (id: string) => {
    const n = Number(salaryInput);
    if (!n || n < 0) return notify(t('Invalid salary'), t('Enter the monthly salary in rupees.'));
    updateTeacher(id, { salary: n });
    setEditingSalary(null);
  };

  return (
    <Screen>
      <SectionTitle
        title={`${t('Teachers')} (${teachers.length})`}
        right={<Button small icon={showForm ? 'close' : 'add'} title={t(showForm ? 'Cancel' : 'Add')} onPress={() => setShowForm(!showForm)} />}
      />

      {showForm && (
        <Card>
          <Input label={t('Full name')} value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="e.g. Nadia Shah" />
          <Input label={t('Email (login)')} value={form.email} onChangeText={(email) => setForm({ ...form, email })}
            autoCapitalize="none" keyboardType="email-address" placeholder="teacher@school.com" />
          <Input label={t('Phone')} value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} keyboardType="phone-pad" placeholder="03xx-xxxxxxx" />
          <Input label={t('Monthly salary (Rs)')} value={form.salary} onChangeText={(v) => setForm({ ...form, salary: v.replace(/[^0-9]/g, '') })}
            keyboardType="number-pad" placeholder="45000" />
          <Text style={styles.label}>{t('Subject')}</Text>
          <Chips options={SUBJECTS.map((s) => ({ label: t(s), value: s }))} value={form.subject} onChange={(subject) => setForm({ ...form, subject })} />
          <Text style={styles.label}>{t('Classes')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {data.classes.map((c) => {
              const on = form.classIds.includes(c.id);
              return (
                <Pressable key={c.id} onPress={() => toggleClass(c.id)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
                    borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : colors.card }}>
                  <Text style={{ color: on ? colors.primary : colors.text, fontWeight: '600' }}>{on ? '✓ ' : ''}{c.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Button title={t('Save teacher')} icon="checkmark" onPress={save} />
        </Card>
      )}

      <Card style={{ paddingVertical: 4 }}>
        {teachers.length === 0 && <EmptyState text={t('No teachers yet')} />}
        {teachers.map((tc, i) => (
          <View key={tc.id}>
            <ListItem
              last={i === teachers.length - 1 && editingSalary !== tc.id}
              left={<Avatar name={tc.name} color={colors.info} />}
              title={tc.name}
              subtitle={`${tc.email}${tc.phone ? ` · ${tc.phone}` : ''}\n${(tc.classIds ?? []).map((c) => className(data, c)).join(', ')}\n${t('Salary')}: ${money(tc.salary ?? 0)}`}
              right={
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Badge text={t(tc.subject ?? '—')} color={colors.info} soft={colors.infoSoft} />
                  <View style={[styles.row, { gap: 4 }]}>
                    <IconButton icon="cash-outline" color={colors.success}
                      onPress={() => { setEditingSalary(editingSalary === tc.id ? null : tc.id); setSalaryInput(String(tc.salary ?? '')); }} />
                    <IconButton icon="trash-outline" color={colors.danger}
                      onPress={() => confirmAction(t('Delete teacher'), `${t('Remove')} ${tc.name}?`, () => deleteTeacher(tc.id))} />
                  </View>
                </View>
              }
            />
            {editingSalary === tc.id && (
              <View style={[styles.row, { gap: 8, paddingVertical: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Input label={t('Monthly salary (Rs)')} value={salaryInput} keyboardType="number-pad"
                    onChangeText={(v) => setSalaryInput(v.replace(/[^0-9]/g, ''))} style={{ marginBottom: -12 }} />
                </View>
                <Button small title={t('Save')} icon="checkmark" onPress={() => saveSalary(tc.id)} style={{ marginTop: 10 }} />
              </View>
            )}
          </View>
        ))}
      </Card>

      <SectionTitle title={`${t('Classes')} (${data.classes.length})`} />
      <Card>
        {data.classes.map((c) => (
          <ListItem key={c.id} title={c.name}
            subtitle={`${data.students.filter((s) => s.classId === c.id).length} ${t('students')}`} />
        ))}
        <View style={[styles.row, { gap: 8, marginTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <Input value={newClass} onChangeText={setNewClass} placeholder={t('New class, e.g. Class 9-A')} style={{ marginBottom: -12 }} />
          </View>
          <Button small title={t('Add')} icon="add" onPress={() => {
            if (!newClass.trim()) return;
            addClass(newClass.trim());
            setNewClass('');
          }} />
        </View>
      </Card>
    </Screen>
  );
}
