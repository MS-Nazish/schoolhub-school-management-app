import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colorForSubject, currentSchoolDay } from '@/components/Timetable';
import { colors } from '@/components/theme';
import { Button, Card, Chips, Screen, styles } from '@/components/ui';
import { DAYS, PERIODS, SUBJECTS } from '@/data/seed';
import { userName, useStore } from '@/data/store';
import { t } from '@/lib/i18n';

export default function AdminTimetable() {
  const { data, setTimetableSlot } = useStore();
  const [classId, setClassId] = useState(data.classes[0]?.id ?? '');
  const [day, setDay] = useState(currentSchoolDay());
  const [editing, setEditing] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const teachers = data.users.filter((u) => u.role === 'teacher');
  const slot = (period: number) => data.timetable.find((e) => e.id === `${classId}_${day}_${period}`);

  const startEdit = (period: number) => {
    const e = slot(period);
    setEditing(editing === period ? null : period);
    setSubject(e?.subject ?? SUBJECTS[0]!);
    setTeacherId(e?.teacherId ?? '');
  };

  // Teachers of the chosen subject first, then everyone else
  const teacherOptions = [...teachers].sort((a, b) => Number(b.subject === subject) - Number(a.subject === subject));

  return (
    <Screen>
      <Chips options={data.classes.map((c) => ({ label: c.name, value: c.id }))} value={classId} onChange={(v) => { setClassId(v); setEditing(null); }} />
      <Chips options={DAYS.map((d, i) => ({ label: t(d.slice(0, 3)), value: String(i + 1) }))} value={String(day)}
        onChange={(v) => { setDay(Number(v)); setEditing(null); }} />

      <Text style={[styles.muted, { marginBottom: 10 }]}>{t('Tap a period to set the subject and teacher.')}</Text>

      <Card style={{ paddingVertical: 4 }}>
        {PERIODS.map((p, i) => {
          const period = i + 1;
          const e = slot(period);
          const [fg] = e ? colorForSubject(e.subject) : [colors.border];
          const open = editing === period;
          return (
            <View key={period} style={{ borderBottomWidth: period === PERIODS.length ? 0 : 1, borderBottomColor: colors.border }}>
              {period === 4 && (
                <View style={{ paddingVertical: 6, alignItems: 'center' }}>
                  <Text style={[styles.muted, { fontSize: 12 }]}>☕ {t('Break')} 10:00 – 10:20</Text>
                </View>
              )}
              <Pressable onPress={() => startEdit(period)} style={[styles.row, { paddingVertical: 12 }]}>
                <View style={{ width: 62 }}>
                  <Text style={[styles.listTitle, { fontSize: 14 }]}>{p.start}</Text>
                  <Text style={[styles.muted, { fontSize: 12 }]}>{p.end}</Text>
                </View>
                <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: fg, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, !e && { color: colors.muted }]}>{e ? t(e.subject) : t('Free period')}</Text>
                  <Text style={styles.muted}>{t('Period')} {period}{e ? ` · ${e.teacherId ? userName(data, e.teacherId) : t('No teacher')}` : ''}</Text>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'create-outline'} size={20} color={colors.muted} />
              </Pressable>

              {open && (
                <View style={{ paddingBottom: 14 }}>
                  <Text style={styles.label}>{t('Subject')}</Text>
                  <Chips options={SUBJECTS.map((s) => ({ label: t(s), value: s }))} value={subject} onChange={setSubject} />
                  <Text style={styles.label}>{t('Teacher')}</Text>
                  <Chips
                    options={[{ label: t('None'), value: '' }, ...teacherOptions.map((tc) => ({ label: `${tc.name} (${t(tc.subject ?? '')})`, value: tc.id }))]}
                    value={teacherId}
                    onChange={setTeacherId}
                  />
                  <View style={[styles.row, { gap: 8 }]}>
                    <Button small title={t('Save')} icon="checkmark" style={{ flex: 1 }}
                      onPress={() => { setTimetableSlot(classId, day, period, subject, teacherId || undefined); setEditing(null); }} />
                    {e && (
                      <Button small variant="outline" title={t('Make free')} icon="close" style={{ flex: 1 }}
                        onPress={() => { setTimetableSlot(classId, day, period, null); setEditing(null); }} />
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
