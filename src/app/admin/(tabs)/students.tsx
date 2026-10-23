import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/components/theme';
import {
  Avatar, Badge, Button, Card, Chips, EmptyState, IconButton, Input, ListItem, Screen, SectionTitle, styles,
} from '@/components/ui';
import { attendanceStats, className, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { confirmAction, notify } from '@/lib/utils';

export default function Students() {
  const { data, addStudent, deleteStudent } = useStore();
  const [classFilter, setClassFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', classId: data.classes[0]?.id ?? '', parentName: '', parentEmail: '' });

  const list = data.students
    .filter((s) => classFilter === 'all' || s.classId === classFilter)
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.classId.localeCompare(b.classId) || a.rollNo - b.rollNo);

  const save = () => {
    if (!form.name.trim() || !form.parentName.trim() || !form.parentEmail.trim()) {
      return notify(t('Missing details'), t('Please fill in all fields.'));
    }
    addStudent({ ...form, name: form.name.trim(), parentName: form.parentName.trim(), parentEmail: form.parentEmail.trim() });
    notify(t('Student added'), `${t('Parent login')}: ${form.parentEmail.trim()} / parent123`);
    setForm({ ...form, name: '', parentName: '', parentEmail: '' });
    setShowForm(false);
  };

  const classOptions = data.classes.map((c) => ({ label: c.name, value: c.id }));

  return (
    <Screen>
      <SectionTitle
        title={`${t('Students')} (${data.students.length})`}
        right={<Button small icon={showForm ? 'close' : 'add'} title={t(showForm ? 'Cancel' : 'Add')} onPress={() => setShowForm(!showForm)} />}
      />

      {showForm && (
        <Card>
          <Input label={t('Student name')} value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="e.g. Ahmed Raza" />
          <Text style={styles.label}>{t('Class')}</Text>
          <Chips options={classOptions} value={form.classId} onChange={(classId) => setForm({ ...form, classId })} />
          <Input label={t('Parent name')} value={form.parentName} onChangeText={(parentName) => setForm({ ...form, parentName })} placeholder="e.g. Mr. Raza" />
          <Input label={t('Parent email (login)')} value={form.parentEmail} onChangeText={(parentEmail) => setForm({ ...form, parentEmail })}
            placeholder="parent@email.com" autoCapitalize="none" keyboardType="email-address" />
          <Button title={t('Save student')} icon="checkmark" onPress={save} />
        </Card>
      )}

      <Input value={search} onChangeText={setSearch} placeholder={t('Search students…')} />
      <Chips options={[{ label: t('All'), value: 'all' }, ...classOptions]} value={classFilter} onChange={setClassFilter} />

      <Card style={{ paddingVertical: 4 }}>
        {list.length === 0 && <EmptyState icon="people-outline" text={t('No students found')} />}
        {list.map((s, i) => {
          const parent = data.users.find((u) => u.id === s.parentId);
          const att = attendanceStats(data, s.id);
          return (
            <ListItem
              key={s.id}
              last={i === list.length - 1}
              onPress={() => router.push(`/student/${s.id}`)}
              left={<Avatar name={s.name} photo={s.photo} />}
              title={s.name}
              subtitle={`${className(data, s.classId)} · ${t('Roll')} #${s.rollNo}\n${t('Parent')}: ${parent?.name ?? '—'}`}
              right={
                <View style={[styles.row, { gap: 6 }]}>
                  <Badge
                    text={`${att.pct}%`}
                    color={att.pct >= 85 ? colors.success : colors.warning}
                    soft={att.pct >= 85 ? colors.successSoft : colors.warningSoft}
                  />
                  <IconButton icon="trash-outline" color={colors.danger}
                    onPress={() => confirmAction(t('Delete student'), `${t('Remove')} ${s.name}?`, () => deleteStudent(s.id))} />
                </View>
              }
            />
          );
        })}
      </Card>
    </Screen>
  );
}
