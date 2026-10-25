import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { colors, radius } from '@/components/theme';
import { Avatar, Badge, Banner, Button, Card, Chips, EmptyState, ListItem, Screen, Segmented, styles } from '@/components/ui';
import { EXAMS, SUBJECTS } from '@/data/seed';
import { useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { classPositions, examSummary, ordinal } from '@/lib/results';
import { grade, notify } from '@/lib/utils';

type Mode = 'subject' | 'student';

export default function TeacherResults() {
  const { data, user, saveResults } = useStore();
  const subject = user?.subject ?? 'General';
  const myClasses = data.classes.filter((c) => user?.classIds?.includes(c.id));
  const [pickedClass, setClassId] = useState('');
  // Fall back to the first class until one is picked (the user may load after this screen mounts)
  const classId = myClasses.some((c) => c.id === pickedClass) ? pickedClass : myClasses[0]?.id ?? '';
  const [exam, setExam] = useState(EXAMS[1]!);
  const [mode, setMode] = useState<Mode>('subject');
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [total, setTotal] = useState('100');

  const students = data.students.filter((s) => s.classId === classId).sort((a, b) => a.rollNo - b.rollNo);

  // Load existing marks (and the paper's total) for the selected class + exam
  useEffect(() => {
    const init: Record<string, string> = {};
    let paperTotal: number | undefined;
    students.forEach((s) => {
      const r = data.results.find((x) => x.id === `${s.id}_${exam}_${subject}`);
      init[s.id] = r ? String(r.marks) : '';
      paperTotal ??= r?.total;
    });
    setMarks(init);
    setTotal(String(paperTotal ?? 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, exam, subject, students.length]);

  if (!myClasses.length) return <Screen><EmptyState text={t('No classes assigned to you yet')} /></Screen>;

  const outOf = Number(total);

  const save = () => {
    if (!outOf || outOf <= 0) return notify(t('Invalid total'), t('total marks must be more than 0.'));
    const parsed: Record<string, number> = {};
    for (const s of students) {
      const v = marks[s.id]?.trim();
      if (!v) continue;
      const n = Number(v);
      if (Number.isNaN(n) || n < 0 || n > outOf) return notify(t('Invalid marks'), `${s.name}: ${t('enter a number from 0 to')} ${outOf}.`);
      parsed[s.id] = n;
    }
    if (!Object.keys(parsed).length) return notify(t('Nothing to save'), t('Enter marks for at least one student.'));
    saveResults(exam, subject, outOf, parsed);
    notify(t('Results saved'), t('{n} results published. Parents have been notified.', { n: Object.keys(parsed).length }));
  };

  const entered = Object.values(marks).filter((v) => v.trim()).map(Number).filter((n) => !Number.isNaN(n));
  const avg = entered.length ? Math.round(entered.reduce((a, b) => a + b, 0) / entered.length) : null;
  const { positions, outOf: ranked } = classPositions(data, classId, exam);

  return (
    <Screen>
      <Chips options={myClasses.map((c) => ({ label: c.name, value: c.id }))} value={classId} onChange={setClassId} />
      <Chips options={EXAMS.map((e) => ({ label: t(e), value: e }))} value={exam} onChange={setExam} />
      <View style={{ marginBottom: 12 }}>
        <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { label: `${t('By subject')} (${t(subject)})`, value: 'subject', icon: 'book-outline' },
            { label: t('By student'), value: 'student', icon: 'person-outline' },
          ]}
        />
      </View>

      {mode === 'student' ? (
        <>
          <Banner icon="document-text-outline" color={colors.info} soft={colors.infoSoft}
            text={t('Tap a student to open their marksheet with all subjects.')} />
          <Card style={{ paddingVertical: 4 }}>
            {students.length === 0 && <EmptyState text={t('No students found')} />}
            {students.map((s, i) => {
              const sum = examSummary(data.results, s.id, exam);
              const pos = positions.get(s.id);
              return (
                <ListItem
                  key={s.id}
                  last={i === students.length - 1}
                  onPress={() => router.push(`/marksheet/${s.id}?exam=${encodeURIComponent(exam)}`)}
                  left={<Avatar name={s.name} size={38} photo={s.photo} />}
                  title={`${s.rollNo}. ${s.name}`}
                  subtitle={sum.count
                    ? `${sum.count}/${SUBJECTS.length} ${t('subjects')} · ${sum.got}/${sum.total} · ${sum.pct}% · ${t('Grade')} ${sum.grade}`
                    : t('No marks entered yet')}
                  right={
                    <View style={[styles.row, { gap: 6 }]}>
                      {pos ? <Badge text={`${ordinal(pos)}/${ranked}`} color={colors.warning} soft={colors.warningSoft} /> : null}
                      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </View>
                  }
                />
              );
            })}
          </Card>
        </>
      ) : (
        <>
          <Banner icon="create-outline" color={colors.info} soft={colors.infoSoft}
            text={t('Tap a box on the right and type the marks, then press "Save & publish results".')} />

          <Card>
            <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{t(subject)} · {t(exam)}</Text>
                {avg !== null && <Text style={styles.muted}>{t('Class avg')} {avg}</Text>}
              </View>
              <View style={[styles.row, { gap: 6 }]}>
                <Text style={styles.muted}>{t('Total marks')}</Text>
                <TextInput
                  value={total}
                  onChangeText={(v) => setTotal(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad" maxLength={3} selectTextOnFocus
                  accessibilityLabel={t('Total marks')}
                  style={{
                    width: 56, textAlign: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
                    paddingVertical: 6, fontSize: 15, fontWeight: '700', color: colors.text, backgroundColor: colors.input,
                  }}
                />
              </View>
            </View>

            {students.map((s) => {
              const n = Number(marks[s.id]);
              const has = !!marks[s.id]?.trim() && !Number.isNaN(n) && outOf > 0;
              const over = has && n > outOf;
              return (
                <View key={s.id} style={[styles.row, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <Avatar name={s.name} size={34} photo={s.photo} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.listTitle}>{s.name}</Text>
                    <Text style={[styles.muted, over && { color: colors.danger }]}>
                      {t('Roll')} #{s.rollNo}{over ? ` · ${t('More than total!')}` : has ? ` · ${t('Grade')} ${grade((n / outOf) * 100)}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.row, { borderWidth: 1.5, borderColor: over ? colors.danger : colors.accent, borderRadius: radius.sm, backgroundColor: colors.input, paddingRight: 6 }]}>
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
                  <Text style={[styles.muted, { width: 40, textAlign: 'right' }]}>/ {outOf || '—'}</Text>
                </View>
              );
            })}
          </Card>

          <Button title={t('Save & publish results')} icon="cloud-upload-outline" onPress={save} style={{ marginBottom: 8 }} />
        </>
      )}
    </Screen>
  );
}
