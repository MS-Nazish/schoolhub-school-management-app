import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { colors, radius, themedStyles } from '@/components/theme';
import { Avatar, Badge, Banner, Button, Card, Chips, EmptyState, ProgressBar, Screen, styles } from '@/components/ui';
import { EXAMS, SUBJECTS } from '@/data/seed';
import { className, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { classPositions, examSummary, ordinal } from '@/lib/results';
import { grade, notify } from '@/lib/utils';

type Row = { obtained: string; total: string };

const gradeColor = (pct: number) => (pct >= 80 ? colors.success : pct >= 60 ? colors.info : pct >= 50 ? colors.warning : colors.danger);

/** One student's marks for every subject of an exam, with total / obtained boxes */
export default function Marksheet() {
  const { id, exam: examParam } = useLocalSearchParams<{ id: string; exam?: string }>();
  const { data, user, saveMarksheet } = useStore();
  const [exam, setExam] = useState(examParam && EXAMS.includes(examParam) ? examParam : EXAMS[1]!);
  const [rows, setRows] = useState<Record<string, Row>>({});

  const student = data.students.find((s) => s.id === id);
  const canEdit = !!student && !!user && (user.role === 'admin' || (user.role === 'teacher' && !!user.classIds?.includes(student.classId)));

  // Load saved marks whenever the student or exam changes
  useEffect(() => {
    const init: Record<string, Row> = {};
    for (const subject of SUBJECTS) {
      const r = data.results.find((x) => x.id === `${id}_${exam}_${subject}`);
      init[subject] = { obtained: r ? String(r.marks) : '', total: String(r?.total ?? 100) };
    }
    setRows(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, exam, data.results.length]);

  if (!student || !canEdit) return <Screen><EmptyState text={t('Student not found')} /></Screen>;

  const classmates = data.students.filter((s) => s.classId === student.classId).sort((a, b) => a.rollNo - b.rollNo);
  const idx = classmates.findIndex((s) => s.id === student.id);
  const prev = classmates[idx - 1];
  const next = classmates[idx + 1];
  const go = (sid: string) => router.replace(`/marksheet/${sid}?exam=${encodeURIComponent(exam)}`);

  // Live totals from what is typed
  let got = 0, total = 0, filled = 0;
  for (const subject of SUBJECTS) {
    const r = rows[subject];
    if (!r?.obtained.trim()) continue;
    const o = Number(r.obtained), tt = Number(r.total);
    if (Number.isNaN(o) || Number.isNaN(tt) || tt <= 0) continue;
    got += o;
    total += tt;
    filled++;
  }
  const pct = total ? Math.round((got / total) * 1000) / 10 : 0;

  const saved = examSummary(data.results, student.id, exam);
  const { positions, outOf } = classPositions(data, student.classId, exam);
  const position = positions.get(student.id);

  const setRow = (subject: string, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [subject]: { ...r[subject]!, ...patch } }));

  const save = (thenGo?: string) => {
    const out: { subject: string; marks: number; total: number }[] = [];
    for (const subject of SUBJECTS) {
      const r = rows[subject]!;
      if (!r.obtained.trim()) continue;
      const o = Number(r.obtained), tt = Number(r.total);
      if (!tt || tt <= 0) return notify(t('Invalid total'), `${t(subject)}: ${t('total marks must be more than 0.')}`);
      if (o < 0 || o > tt) return notify(t('Invalid marks'), `${t(subject)}: ${t('obtained marks cannot be more than total marks.')}`);
      out.push({ subject, marks: o, total: tt });
    }
    if (!out.length) return notify(t('Nothing to save'), t('Enter marks for at least one subject.'));
    saveMarksheet(student.id, exam, out);
    if (thenGo) go(thenGo);
    else notify(t('Marksheet saved'), t("{name}'s {exam} result has been published.", { name: student.name, exam: t(exam) }));
  };

  return (
    <Screen>
      <Card style={{ backgroundColor: colors.header }}>
        <View style={styles.row}>
          <Avatar name={student.name} size={52} photo={student.photo} color="#818CF8" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{student.name}</Text>
            <Text style={{ color: '#C7D2FE' }}>{className(data, student.classId)} · {t('Roll')} #{student.rollNo}</Text>
          </View>
          {position && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#FDE68A', fontSize: 20, fontWeight: '800' }}>🏆 {ordinal(position)}</Text>
              <Text style={{ color: '#C7D2FE', fontSize: 11 }}>{t('of {n}', { n: outOf })}</Text>
            </View>
          )}
        </View>
      </Card>

      <Chips options={EXAMS.map((e) => ({ label: t(e), value: e }))} value={exam} onChange={setExam} />

      <Banner icon="create-outline" color={colors.info} soft={colors.infoSoft}
        text={t('Enter total and obtained marks for each subject. Leave a subject empty if there was no paper.')} />

      <Card>
        <View style={[s.row, s.head]}>
          <Text style={[s.headText, { flex: 1 }]}>{t('Subject')}</Text>
          <Text style={[s.headText, s.col]}>{t('Total')}</Text>
          <Text style={[s.headText, s.col]}>{t('Obtained')}</Text>
          <Text style={[s.headText, s.gradeCol]}>{t('Grade')}</Text>
        </View>
        {SUBJECTS.map((subject) => {
          const r = rows[subject] ?? { obtained: '', total: '100' };
          const o = Number(r.obtained), tt = Number(r.total);
          const has = !!r.obtained.trim() && tt > 0 && !Number.isNaN(o);
          const p = has ? (o / tt) * 100 : 0;
          const over = has && o > tt;
          return (
            <View key={subject} style={[s.row, s.line]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{t(subject)}</Text>
                <Text style={[styles.muted, { fontSize: 12 }]}>{has ? `${Math.round(p)}%` : t('Not entered')}</Text>
              </View>
              <TextInput
                value={r.total}
                onChangeText={(v) => setRow(subject, { total: v.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad" maxLength={3} selectTextOnFocus
                accessibilityLabel={`${subject} ${t('total marks')}`}
                style={[s.box, s.col, { borderColor: colors.border }]}
              />
              <TextInput
                value={r.obtained}
                onChangeText={(v) => setRow(subject, { obtained: v.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad" maxLength={3} selectTextOnFocus
                placeholder="—" placeholderTextColor={colors.muted}
                accessibilityLabel={`${subject} ${t('obtained marks')}`}
                style={[s.box, s.col, { borderColor: over ? colors.danger : colors.accent, borderWidth: 1.5 }]}
              />
              <Text style={[s.gradeCol, { fontWeight: '800', color: over ? colors.danger : has ? gradeColor(p) : colors.muted }]}>
                {over ? '!' : has ? grade(p) : '—'}
              </Text>
            </View>
          );
        })}

        <View style={[s.row, s.totalLine]}>
          <Text style={[styles.listTitle, { flex: 1 }]}>{t('Grand total')}</Text>
          <Text style={[s.col, s.totalText]}>{total || '—'}</Text>
          <Text style={[s.col, s.totalText]}>{filled ? got : '—'}</Text>
          <Text style={[s.gradeCol, s.totalText, { color: filled ? gradeColor(pct) : colors.muted }]}>{filled ? grade(pct) : '—'}</Text>
        </View>
      </Card>

      <Card>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={styles.listTitle}>{t('Percentage')}</Text>
          <Text style={[styles.h1, { fontSize: 22, color: filled ? gradeColor(pct) : colors.muted }]}>{filled ? `${pct}%` : '—'}</Text>
        </View>
        <ProgressBar pct={pct} color={gradeColor(pct)} />
        <View style={[styles.row, { justifyContent: 'space-between', marginTop: 10 }]}>
          <Text style={styles.muted}>{t('{n} of {m} subjects entered', { n: filled, m: SUBJECTS.length })}</Text>
          {saved.count > 0 && position
            ? <Badge text={`${t('Position')}: ${ordinal(position)} / ${outOf}`} color={colors.warning} soft={colors.warningSoft} />
            : <Badge text={t('Not saved yet')} color={colors.muted} soft={colors.bg} />}
        </View>
      </Card>

      <Button title={t('Save marksheet')} icon="save-outline" onPress={() => save()} style={{ marginBottom: 10 }} />
      <View style={[styles.row, { gap: 8, marginBottom: 8 }]}>
        <Button small variant="outline" icon="chevron-back" title={prev ? prev.name.split(' ')[0]! : t('Previous')}
          disabled={!prev} onPress={() => prev && go(prev.id)} style={{ flex: 1 }} />
        <Button small variant="outline" icon="chevron-forward" title={next ? `${t('Save & next')}: ${next.name.split(' ')[0]}` : t('Last student')}
          disabled={!next} onPress={() => next && save(next.id)} style={{ flex: 1.6 }} />
      </View>
      <Text style={[styles.muted, { textAlign: 'center', fontSize: 12 }]}>
        <Ionicons name="information-circle-outline" size={12} /> {t('Position is based on saved marks of the whole class.')}
      </Text>
    </Screen>
  );
}

const s = themedStyles(() => ({
  row: { flexDirection: 'row' as const, alignItems: 'center' as const },
  head: { paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  headText: { color: colors.muted, fontSize: 12, fontWeight: '700' as const },
  line: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  col: { width: 64, textAlign: 'center' as const, marginLeft: 8 },
  gradeCol: { width: 40, textAlign: 'center' as const, marginLeft: 6 },
  box: {
    borderWidth: 1, borderRadius: radius.sm, paddingVertical: 8, fontSize: 16, fontWeight: '700' as const,
    color: colors.text, backgroundColor: colors.input,
  },
  totalLine: { paddingTop: 12 },
  totalText: { fontSize: 16, fontWeight: '800' as const, color: colors.text },
}));
