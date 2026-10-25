import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { dmyToIso, isoToDmy } from '@/components/DateInput';
import { StudentForm, type StudentFormValues, validateStudent } from '@/components/StudentForm';
import { colors } from '@/components/theme';
import { Avatar, Banner, Button, Card, EmptyState, Screen, styles } from '@/components/ui';
import { className, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { confirmAction, notify } from '@/lib/utils';

export default function EditStudent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loaded, updateStudent, updateUser, deleteStudent } = useStore();
  const student = data.students.find((s) => s.id === id);
  const parent = data.users.find((u) => u.id === student?.parentId);
  const [form, setForm] = useState<StudentFormValues | null>(null);

  // Fill the form once the student is available (the page can open before the data has loaded)
  useEffect(() => {
    if (form || !student) return;
    setForm({
      name: student.name, classId: student.classId, rollNo: String(student.rollNo), gender: student.gender ?? '',
      dob: isoToDmy(student.dob), admissionDate: isoToDmy(student.admissionDate), address: student.address ?? '',
      parentName: parent?.name ?? '', parentEmail: parent?.email ?? '', parentPhone: parent?.phone ?? '',
    });
  }, [form, student, parent]);

  if (!student || !form) return <Screen>{loaded && !student ? <EmptyState text={t('Student not found')} /> : null}</Screen>;

  const siblings = parent ? data.students.filter((s) => s.parentId === parent.id && s.id !== student.id) : [];

  const save = () => {
    const err = validateStudent(form);
    if (err) return notify(t('Missing details'), err);
    const rollNo = Number(form.rollNo) || student.rollNo;
    const clash = data.students.find((s) => s.id !== student.id && s.classId === form.classId && s.rollNo === rollNo);
    if (clash) return notify(t('Roll number in use'), t('{name} already has roll #{n} in this class.', { name: clash.name, n: rollNo }));

    updateStudent(student.id, {
      name: form.name.trim(),
      classId: form.classId,
      rollNo,
      gender: form.gender || undefined,
      dob: dmyToIso(form.dob) ?? undefined,
      admissionDate: dmyToIso(form.admissionDate) ?? undefined,
      address: form.address.trim() || undefined,
    });
    if (parent) updateUser(parent.id, { name: form.parentName.trim(), phone: form.parentPhone.trim() || undefined });
    notify(t('Student updated'), t('{name} has been saved.', { name: form.name.trim() }));
    router.back();
  };

  return (
    <Screen>
      <Card style={[styles.row, { backgroundColor: colors.header }]}>
        <Avatar name={form.name || student.name} size={52} photo={student.photo} color="#818CF8" />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{form.name || student.name}</Text>
          <Text style={{ color: '#C7D2FE' }}>{className(data, form.classId)} · {t('Roll')} #{form.rollNo || student.rollNo}</Text>
        </View>
      </Card>

      {siblings.length > 0 && (
        <Banner icon="people-outline" color={colors.info} soft={colors.infoSoft}
          text={t('Parent details are shared with: {names}', { names: siblings.map((s) => s.name).join(', ') })} />
      )}

      <Card>
        <StudentForm value={form} onChange={setForm} parentEmailLocked />
        <Button title={t('Save changes')} icon="checkmark" onPress={save} />
      </Card>

      <Text style={[styles.muted, { textAlign: 'center', marginBottom: 12 }]}>{t('To change the photo, tap it on the student profile.')}</Text>

      <Button variant="danger" icon="trash-outline" title={t('Delete student')} style={{ marginBottom: 8 }}
        onPress={() => confirmAction(t('Delete student'), `${t('Remove')} ${student.name}?`, () => {
          deleteStudent(student.id);
          router.replace('/admin/students');
        })} />
    </Screen>
  );
}
