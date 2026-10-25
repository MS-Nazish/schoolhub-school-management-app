import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/components/theme';
import {
  Avatar, Badge, Button, Card, Chips, EmptyState, IconButton, Input, ListItem, Screen, SectionTitle, styles,
} from '@/components/ui';
import { dmyToIso, isoToDmy } from '@/components/DateInput';
import { StudentForm, type StudentFormValues, validateStudent } from '@/components/StudentForm';
import { attendanceStats, className, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { confirmAction, notify, today } from '@/lib/utils';

export default function Students() {
  const { data, addStudent, deleteStudent } = useStore();
  const [classFilter, setClassFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const emptyForm = (classId = data.classes[0]?.id ?? ''): StudentFormValues => ({
    name: '', classId, rollNo: '', gender: '', dob: '', admissionDate: isoToDmy(today()), address: '',
    parentName: '', parentEmail: '', parentPhone: '',
  });
  const [form, setForm] = useState<StudentFormValues>(() => emptyForm());

  const list = data.students
    .filter((s) => classFilter === 'all' || s.classId === classFilter)
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.classId.localeCompare(b.classId) || a.rollNo - b.rollNo);

  const save = () => {
    const err = validateStudent(form);
    if (err) return notify(t('Missing details'), err);
    const rollNo = Number(form.rollNo) || undefined;
    const clash = rollNo && data.students.find((s) => s.classId === form.classId && s.rollNo === rollNo);
    if (clash) return notify(t('Roll number in use'), t('{name} already has roll #{n} in this class.', { name: clash.name, n: rollNo }));
    const email = form.parentEmail.trim();
    const existingParent = data.users.find((u) => u.role === 'parent' && u.email.toLowerCase() === email.toLowerCase());
    addStudent({
      name: form.name.trim(), classId: form.classId, rollNo,
      gender: form.gender || undefined, dob: dmyToIso(form.dob) ?? undefined, admissionDate: dmyToIso(form.admissionDate) ?? undefined,
      address: form.address.trim() || undefined,
      parentName: form.parentName.trim(), parentEmail: email, parentPhone: form.parentPhone.trim() || undefined,
    });
    notify(t('Student added'), existingParent
      ? t('Linked to existing parent {name}.', { name: existingParent.name })
      : `${t('Parent login')}: ${email} / parent123`);
    setForm(emptyForm(form.classId));
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
          <StudentForm value={form} onChange={setForm} />
          <Text style={[styles.muted, { marginBottom: 10 }]}>{t('Tip: use an existing parent email to link brothers and sisters.')}</Text>
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
                  <IconButton icon="trash-outline" color={colors.danger} label={`${t('Delete student')}: ${s.name}`}
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
