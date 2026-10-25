import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { TeacherForm, type TeacherFormValues, validateTeacher } from '@/components/TeacherForm';
import { colors } from '@/components/theme';
import { Avatar, Badge, Banner, Button, Card, EmptyState, IconButton, Input, ListItem, Screen, SectionTitle, styles } from '@/components/ui';
import { DEFAULT_SALARY, SUBJECTS } from '@/data/seed';
import { className, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { confirmAction, money, notify } from '@/lib/utils';

const emptyForm = (): TeacherFormValues => ({
  name: '', email: '', phone: '', salary: String(DEFAULT_SALARY), subject: SUBJECTS[0]!, classIds: [],
});

export default function Teachers() {
  const { data, addTeacher, deleteTeacher, addClass } = useStore();
  const teachers = data.users.filter((u) => u.role === 'teacher').sort((a, b) => a.name.localeCompare(b.name));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [newClass, setNewClass] = useState('');

  const save = () => {
    const err = validateTeacher(form);
    if (err) return notify(t('Missing details'), err);
    if (data.users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase())) {
      return notify(t('Email in use'), t('Another account already uses this email.'));
    }
    addTeacher({ ...form, salary: Number(form.salary), name: form.name.trim(), email: form.email.trim() });
    notify(t('Teacher added'), `${t('Login')}: ${form.email.trim()} / teacher123`);
    setForm(emptyForm());
    setShowForm(false);
  };

  const edit = (id: string) => router.push(`/admin/teacher/${id}`);

  return (
    <Screen>
      <SectionTitle
        title={`${t('Teachers')} (${teachers.length})`}
        right={<Button small icon={showForm ? 'close' : 'add'} title={t(showForm ? 'Cancel' : 'Add')} onPress={() => setShowForm(!showForm)} />}
      />

      {showForm && (
        <Card>
          <TeacherForm value={form} onChange={setForm} />
          <Button title={t('Save teacher')} icon="checkmark" onPress={save} />
        </Card>
      )}

      {!showForm && teachers.length > 0 && (
        <Banner icon="create-outline" color={colors.info} soft={colors.infoSoft} text={t('Tap a teacher to edit their details.')} />
      )}

      <Card style={{ paddingVertical: 4 }}>
        {teachers.length === 0 && <EmptyState text={t('No teachers yet')} />}
        {teachers.map((tc, i) => (
          <ListItem
            key={tc.id}
            last={i === teachers.length - 1}
            onPress={() => edit(tc.id)}
            left={<Avatar name={tc.name} color={colors.info} />}
            title={tc.name}
            subtitle={`${tc.email}${tc.phone ? ` · ${tc.phone}` : ''}\n${(tc.classIds ?? []).map((c) => className(data, c)).join(', ')}\n${t('Salary')}: ${money(tc.salary ?? 0)}`}
            right={
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Badge text={t(tc.subject ?? '—')} color={colors.info} soft={colors.infoSoft} />
                <View style={[styles.row, { gap: 4 }]}>
                  <IconButton icon="create-outline" color={colors.primary} label={`${t('Edit teacher')}: ${tc.name}`} onPress={() => edit(tc.id)} />
                  <IconButton icon="trash-outline" color={colors.danger} label={`${t('Delete teacher')}: ${tc.name}`}
                    onPress={() => confirmAction(t('Delete teacher'), `${t('Remove')} ${tc.name}?`, () => deleteTeacher(tc.id))} />
                </View>
              </View>
            }
          />
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
