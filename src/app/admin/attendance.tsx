import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, radius } from '@/components/theme';
import { Avatar, Badge, Button, Card, EmptyState, ProgressBar, Screen, styles } from '@/components/ui';
import { className, useStore, userName } from '@/data/store';
import { STAFF_ATTENDANCE, type AttendanceRecord, type AttendanceStatus } from '@/data/types';
import { t } from '@/lib/i18n';
import { addDays, clock, dayOfWeek, formatDate, notify, today } from '@/lib/utils';

const statusList = () => [
  { key: 'P' as const, name: t('Present'), color: colors.success, soft: colors.successSoft },
  { key: 'A' as const, name: t('Absent'), color: colors.danger, soft: colors.dangerSoft },
  { key: 'L' as const, name: t('Leave'), color: colors.warning, soft: colors.warningSoft },
];

const count = (marks: Record<string, AttendanceStatus>, k: AttendanceStatus) => Object.values(marks).filter((m) => m === k).length;

/** Date-wise register: who marked which class (with counts and names), plus staff attendance */
export default function AttendanceRegister() {
  const { data, saveStaffAttendance } = useStore();
  const [daysShown, setDaysShown] = useState(7);
  // null = untouched: the latest day starts expanded
  const [openDates, setOpen] = useState<Set<string> | null>(null);
  // Unsaved staff marks per date
  const [drafts, setDrafts] = useState<Record<string, Record<string, AttendanceStatus>>>({});

  const teachers = data.users.filter((u) => u.role === 'teacher').sort((a, b) => a.name.localeCompare(b.name));
  const STATUS = statusList();

  // School days (Mon–Sat) back from today, plus any Sunday that has records
  const dates: string[] = [];
  for (let d = today(), i = 0; dates.length < daysShown && i < 120; d = addDays(d, -1), i++) {
    if (dayOfWeek(d) !== 0 || data.attendance.some((a) => a.date === d)) dates.push(d);
  }

  const open = openDates ?? new Set(dates.slice(0, 1));
  const toggle = (date: string) => setOpen(() => {
    const n = new Set(open);
    if (n.has(date)) n.delete(date);
    else n.add(date);
    return n;
  });

  const staffMarks = (date: string, rec?: AttendanceRecord) => {
    const base: Record<string, AttendanceStatus> = {};
    teachers.forEach((tc) => (base[tc.id] = rec?.marks[tc.id] ?? 'P'));
    return { ...base, ...drafts[date] };
  };

  return (
    <Screen>
      <Text style={[styles.muted, { marginBottom: 12 }]}>
        {t('Each day shows which teacher marked which class, with present/absent/leave, and the staff attendance.')}
      </Text>

      {dates.map((date) => {
        const recs = data.attendance.filter((a) => a.date === date && a.classId !== STAFF_ATTENDANCE);
        const staffRec = data.attendance.find((a) => a.id === `${STAFF_ATTENDANCE}_${date}`);
        const allMarks = recs.flatMap((r) => Object.values(r.marks));
        const pct = allMarks.length ? Math.round((allMarks.filter((m) => m === 'P').length / allMarks.length) * 100) : null;
        const unmarked = data.classes.filter((c) => !recs.some((r) => r.classId === c.id));
        const staffPresent = staffRec ? count(staffRec.marks, 'P') : null;
        const isOpen = open.has(date);
        const sunday = dayOfWeek(date) === 0;

        // Group class records by the teacher who marked them
        const byTeacher = new Map<string, AttendanceRecord[]>();
        recs.forEach((r) => byTeacher.set(r.takenBy, [...(byTeacher.get(r.takenBy) ?? []), r]));

        return (
          <Card key={date} style={{ paddingVertical: 12 }}>
            {/* Date header */}
            <Pressable onPress={() => toggle(date)} style={[styles.row, { gap: 10 }]} accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: date === today() ? colors.accent : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: date === today() ? '#fff' : colors.primary, fontWeight: '800', fontSize: 16 }}>{Number(date.slice(8))}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{formatDate(date)}{date === today() ? ` · ${t('Today')}` : ''}</Text>
                <Text style={styles.muted}>
                  {sunday ? t('Sunday') : pct === null ? t('No student attendance yet') : `${t('Students')} ${pct}% ${t('present')}`}
                  {' · '}{data.classes.length - unmarked.length}/{data.classes.length} {t('classes marked')}
                  {' · '}{staffPresent === null ? t('Staff not marked') : `${t('Staff')} ${staffPresent}/${teachers.length} ${t('present')}`}
                </Text>
              </View>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
            </Pressable>
            {pct !== null && <ProgressBar pct={pct} color={pct >= 85 ? colors.success : colors.warning} />}

            {isOpen && (
              <View style={{ marginTop: 12 }}>
                {/* Student attendance, teacher-wise */}
                <View style={[styles.row, { gap: 6, marginBottom: 8 }]}>
                  <Ionicons name="people-outline" size={16} color={colors.primary} />
                  <Text style={styles.label}>{t('Student attendance by teacher')}</Text>
                </View>
                {byTeacher.size === 0 && <Text style={[styles.muted, { marginBottom: 8 }]}>{t('No class has been marked on this day.')}</Text>}
                {[...byTeacher.entries()].map(([teacherId, list]) => {
                  const teacher = data.users.find((u) => u.id === teacherId);
                  return (
                    <View key={teacherId} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, marginBottom: 8 }}>
                      <View style={[styles.row, { gap: 8, marginBottom: 6 }]}>
                        <Avatar name={teacher?.name ?? '?'} size={30} color={colors.info} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.listTitle}>{teacher?.name ?? userName(data, teacherId)}</Text>
                          <Text style={[styles.muted, { fontSize: 12 }]}>
                            {teacher?.role === 'admin' ? t('Admin') : t(teacher?.subject ?? '')} · {list.length} {t('class(es)')}
                          </Text>
                        </View>
                      </View>
                      {list.sort((a, b) => a.classId.localeCompare(b.classId)).map((r) => {
                        const names = (k: AttendanceStatus) => Object.entries(r.marks).filter(([, m]) => m === k)
                          .map(([sid]) => data.students.find((s) => s.id === sid)?.name).filter(Boolean).join(', ');
                        return (
                          <View key={r.id} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                            <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }]}>
                              <Text style={styles.body}>
                                <Text style={{ fontWeight: '700' }}>{className(data, r.classId)}</Text>
                                {r.takenAt ? `  ·  ${t('marked at')} ${clock(r.takenAt)}` : ''}
                              </Text>
                              <View style={[styles.row, { gap: 4 }]}>
                                {STATUS.map((st) => (
                                  <Badge key={st.key} text={`${st.key === 'P' ? '✓' : st.key === 'A' ? '✗' : 'L'} ${count(r.marks, st.key)}`} color={st.color} soft={st.soft} />
                                ))}
                              </View>
                            </View>
                            {!!names('A') && <Text style={[styles.muted, { color: colors.danger, marginTop: 3 }]}>{t('Absent')}: {names('A')}</Text>}
                            {!!names('L') && <Text style={[styles.muted, { color: colors.warning, marginTop: 2 }]}>{t('Leave')}: {names('L')}</Text>}
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
                {!sunday && unmarked.length > 0 && (
                  <Text style={[styles.muted, { color: colors.danger, marginBottom: 10 }]}>
                    ⚠️ {t('Not marked')}: {unmarked.map((c) => c.name).join(', ')}
                  </Text>
                )}

                {/* Staff attendance */}
                <View style={[styles.row, { justifyContent: 'space-between', marginTop: 6, marginBottom: 6 }]}>
                  <View style={[styles.row, { gap: 6 }]}>
                    <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
                    <Text style={styles.label}>{t('Staff attendance')}</Text>
                  </View>
                  {staffRec?.takenAt && <Text style={[styles.muted, { fontSize: 12 }]}>{t('Saved at')} {clock(staffRec.takenAt)}</Text>}
                </View>
                {teachers.length === 0 && <EmptyState text={t('No teachers yet')} />}
                {(() => {
                  const marks = staffMarks(date, staffRec);
                  return (
                    <>
                      {teachers.map((tc) => (
                        <View key={tc.id} style={[styles.row, { paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }]}>
                          <Avatar name={tc.name} size={30} color={colors.info} />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.body}>{tc.name}</Text>
                            <Text style={[styles.muted, { fontSize: 12 }]}>{t(tc.subject ?? '')}</Text>
                          </View>
                          <View style={[styles.row, { gap: 6 }]}>
                            {STATUS.map((st) => {
                              const on = marks[tc.id] === st.key;
                              return (
                                <Pressable key={st.key} accessibilityLabel={`${tc.name} ${st.name}`}
                                  onPress={() => setDrafts((dr) => ({ ...dr, [date]: { ...marks, [tc.id]: st.key } }))}
                                  style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: st.color, backgroundColor: on ? st.color : colors.card, alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ color: on ? '#fff' : st.color, fontWeight: '800', fontSize: 12 }}>{t(st.key)}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                      {teachers.length > 0 && (
                        <View style={[styles.row, { gap: 8, marginTop: 10 }]}>
                          <Button small variant="outline" title={t('All present')} style={{ flex: 1 }}
                            onPress={() => setDrafts((dr) => ({ ...dr, [date]: Object.fromEntries(teachers.map((tc) => [tc.id, 'P' as const])) }))} />
                          <Button small icon="save-outline" title={t(staffRec ? 'Update staff attendance' : 'Save staff attendance')} style={{ flex: 1.4 }}
                            onPress={() => {
                              saveStaffAttendance(date, marks);
                              setDrafts((dr) => { const n = { ...dr }; delete n[date]; return n; });
                              notify(t('Staff attendance saved'), t('{p} present · {a} absent · {l} on leave', { p: count(marks, 'P'), a: count(marks, 'A'), l: count(marks, 'L') }));
                            }} />
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
            )}
          </Card>
        );
      })}

      <Button variant="outline" icon="time-outline" title={t('Show 7 more days')} onPress={() => setDaysShown((n) => n + 7)} style={{ marginBottom: 8 }} />
    </Screen>
  );
}
