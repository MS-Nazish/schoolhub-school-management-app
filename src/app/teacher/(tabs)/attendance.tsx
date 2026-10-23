import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, themedStyles } from '@/components/theme';
import { Avatar, Banner, Button, Card, Chips, EmptyState, Screen, styles } from '@/components/ui';
import { useStore } from '@/data/store';
import type { AttendanceStatus } from '@/data/types';
import { t } from '@/lib/i18n';
import { addDays, formatDate, isWeekend, notify, today } from '@/lib/utils';

const statusList = () => [
  { key: 'P' as const, label: t('P'), name: t('Present'), color: colors.success, soft: colors.successSoft },
  { key: 'A' as const, label: t('A'), name: t('Absent'), color: colors.danger, soft: colors.dangerSoft },
  { key: 'L' as const, label: t('L'), name: t('Leave'), color: colors.warning, soft: colors.warningSoft },
];

export default function TeacherAttendance() {
  const { data, user, saveAttendance } = useStore();
  const myClasses = data.classes.filter((c) => user?.classIds?.includes(c.id));
  const [pickedClass, setClassId] = useState('');
  // Fall back to the first class until one is picked (the user may load after this screen mounts)
  const classId = myClasses.some((c) => c.id === pickedClass) ? pickedClass : myClasses[0]?.id ?? '';
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});

  const students = data.students.filter((s) => s.classId === classId).sort((a, b) => a.rollNo - b.rollNo);
  const existing = data.attendance.find((a) => a.id === `${classId}_${date}`);

  // Load saved marks (or default everyone to present) when class/date changes
  useEffect(() => {
    const init: Record<string, AttendanceStatus> = {};
    students.forEach((s) => (init[s.id] = existing?.marks[s.id] ?? 'P'));
    setMarks(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date, existing?.id, students.length]);

  if (!myClasses.length) return <Screen><EmptyState text={t('No classes assigned to you yet')} /></Screen>;

  const STATUS = statusList();
  const counts = { P: 0, A: 0, L: 0 };
  Object.values(marks).forEach((m) => counts[m]++);

  const save = () => {
    saveAttendance(classId, date, marks);
    const absent = students.filter((s) => marks[s.id] === 'A');
    notify(
      t('Attendance saved'),
      absent.length ? `${t('Absence alerts sent to parents of')}: ${absent.map((s) => s.name).join(', ')}` : t('All students are present.'),
    );
  };

  return (
    <Screen>
      <Chips options={myClasses.map((c) => ({ label: c.name, value: c.id }))} value={classId} onChange={setClassId} />

      <Card style={{ paddingVertical: 10 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.listTitle}>{formatDate(date)}</Text>
            <Text style={styles.muted}>{date === today() ? t('Today') : existing ? t('Saved') : t('Not marked')}</Text>
          </View>
          <Pressable onPress={() => date < today() && setDate(addDays(date, 1))} hitSlop={10} disabled={date >= today()}>
            <Ionicons name="chevron-forward" size={22} color={date >= today() ? colors.border : colors.primary} />
          </Pressable>
        </View>
      </Card>

      {isWeekend(date) && <Banner icon="sunny" text={t('This is a weekend.')} color={colors.warning} soft={colors.warningSoft} />}
      {existing && <Banner icon="checkmark-circle" text={t('Attendance already saved — you can edit and save again.')}
        color={colors.success} soft={colors.successSoft} />}

      <View style={[styles.row, { gap: 8, marginBottom: 12 }]}>
        {STATUS.map((st) => (
          <View key={st.key} style={[s.count, { backgroundColor: st.soft }]}>
            <Text style={[s.countNum, { color: st.color }]}>{counts[st.key]}</Text>
            <Text style={{ color: st.color, fontSize: 12, fontWeight: '600' }}>{st.name}</Text>
          </View>
        ))}
      </View>

      <Card>
        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
          <Text style={styles.listTitle}>{students.length} {t('students')}</Text>
          <Button small variant="ghost" title={t('All present')} onPress={() => {
            const all: Record<string, AttendanceStatus> = {};
            students.forEach((st) => (all[st.id] = 'P'));
            setMarks(all);
          }} />
        </View>
        {students.map((st) => (
          <View key={st.id} style={s.studentRow}>
            <Pressable onPress={() => router.push(`/student/${st.id}`)} style={[styles.row, { flex: 1 }]}>
              <Avatar name={st.name} size={36} photo={st.photo} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.listTitle}>{st.name}</Text>
                <Text style={styles.muted}>{t('Roll')} #{st.rollNo}</Text>
              </View>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {STATUS.map((opt) => {
                const on = marks[st.id] === opt.key;
                return (
                  <Pressable key={opt.key} onPress={() => setMarks({ ...marks, [st.id]: opt.key })}
                    accessibilityLabel={`${st.name} ${opt.name}`}
                    style={[s.toggle, { borderColor: opt.color, backgroundColor: on ? opt.color : colors.card }]}>
                    <Text style={{ color: on ? '#fff' : opt.color, fontWeight: '800' }}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </Card>

      <Button title={t(existing ? 'Update attendance' : 'Save attendance')} icon="save-outline" onPress={save} disabled={!students.length} />
    </Screen>
  );
}

const s = themedStyles(() => StyleSheet.create({
  count: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md },
  countNum: { fontSize: 20, fontWeight: '800' },
  studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  toggle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
}));
