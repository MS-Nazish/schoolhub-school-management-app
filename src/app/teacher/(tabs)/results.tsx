import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { colors, radius } from '@/components/theme';
import { Avatar, Badge, Banner, Button, Card, Chips, EmptyState, Screen, styles } from '@/components/ui';
import { EXAMS } from '@/data/seed';
import { useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { grade, notify } from '@/lib/utils';

const TOTAL = 100;

export default function TeacherResults() {
  const { data, user, saveResults } = useStore();
  const subject = user?.subject ?? 'General';
  const myClasses = data.classes.filter((c) => user?.classIds?.includes(c.id));
  const [pickedClass, setClassId] = useState('');
  // Fall back to the first class until one is picked (the user may load after this screen mounts)
  const classId = myClasses.some((c) => c.id === pickedClass) ? pickedClass : myClasses[0]?.id ?? '';
  const [exam, setExam] = useState(EXAMS[1]!);
  const [marks, setMarks] = useState<Record<string, string>>({});

  const students = data.students.filter((s) => s.classId === classId).sort((a, b) => a.rollNo - b.rollNo);

  // Load existing marks for the selected class + exam
  useEffect(() => {
    const init: Record<string, string> = {};
    students.forEach((s) => {
      const r = data.results.find((x) => x.id === `${s.id}_${exam}_${subject}`);
      init[s.id] = r ? String(r.marks) : '';
    });
    setMarks(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, exam, subject, students.length]);

  if (!myClasses.length) return <Screen><EmptyState text={t('No classes assigned to you yet')} /></Screen>;

  const save = () => {
    const parsed: Record<string, number> = {};
    for (const s of students) {
      const v = marks[s.id]?.trim();
      if (!v) continue;
      const n = Number(v);
      if (Number.isNaN(n) || n < 0 || n > TOTAL) return notify(t('Invalid marks'), `${s.name}: ${t('enter a number from 0 to')} ${TOTAL}.`);
      parsed[s.id] = n;
    }
    if (!Object.keys(parsed).length) return notify(t('Nothing to save'), t('Enter marks for at least one student.'));
    saveResults(exam, subject, TOTAL, parsed);
    notify(t('Results saved'), t('{n} results published. Parents have been notified.', { n: Object.keys(parsed).length }));
  };

  const entered = Object.values(marks).filter((v) => v.trim()).map(Number).filter((n) => !Number.isNaN(n));
  const avg = entered.length ? Math.round(entered.reduce((a, b) => a + b, 0) / entered.length) : null;

  return (
    <Screen>
      <Chips options={myClasses.map((c) => ({ label: c.name, value: c.id }))} value={classId} onChange={setClassId} />
      <Chips options={EXAMS.map((e) => ({ label: t(e), value: e }))} value={exam} onChange={setExam} />

      <Banner icon="create-outline" color={colors.info} soft={colors.infoSoft}
        text={t('Tap a box on the right and type the marks, then press "Save & publish results".')} />

      <Card>
        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
          <View>
            <Text style={styles.listTitle}>{t(subject)} · {t(exam)}</Text>
            <Text style={styles.muted}>{t('Out of {n} marks', { n: TOTAL })}</Text>
          </View>
          {avg !== null && <Badge text={`${t('Class avg')} ${avg}`} color={colors.info} soft={colors.infoSoft} />}
        </View>

        {students.map((s) => {
          const n = Number(marks[s.id]);
          const has = !!marks[s.id]?.trim() && !Number.isNaN(n);
          return (
            <View key={s.id} style={[styles.row, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Avatar name={s.name} size={34} photo={s.photo} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.listTitle}>{s.name}</Text>
                <Text style={styles.muted}>{t('Roll')} #{s.rollNo}{has ? ` · ${t('Grade')} ${grade((n / TOTAL) * 100)}` : ''}</Text>
              </View>
              <View style={[styles.row, { borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.sm, backgroundColor: colors.input, paddingRight: 6 }]}>
                <TextInput
                  value={marks[s.id] ?? ''}
                  onChangeText={(v) => setMarks({ ...marks, [s.id]: v.replace(/[^0-9]/g, '') })}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder={t('Marks')}
                  placeholderTextColor={colors.muted}
                  selectTextOnFocus
                  accessibilityLabel={`${s.name} ${t('marks')}`}
                  style={{ width: 58, textAlign: 'center', paddingVertical: 8, fontSize: 16, fontWeight: '700', color: colors.text }}
                />
                <Ionicons name="pencil" size={14} color={colors.accent} />
              </View>
            </View>
          );
        })}
      </Card>

      <Button title={t('Save & publish results')} icon="cloud-upload-outline" onPress={save} style={{ marginBottom: 8 }} />
    </Screen>
  );
}
