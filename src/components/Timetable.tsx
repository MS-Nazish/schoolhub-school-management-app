import { useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from './theme';
import { Badge, Card, Chips, EmptyState, styles } from './ui';
import { DAYS, PERIODS, SUBJECTS } from '@/data/seed';
import { className, userName, useStore } from '@/data/store';
import type { TimetableEntry } from '@/data/types';
import { t } from '@/lib/i18n';
import { dayOfWeek, today } from '@/lib/utils';

/** Today's weekday as 1–6, or 1 (Monday) on Sunday so there is always something to show */
export const currentSchoolDay = () => dayOfWeek(today()) || 1;
export const isSunday = () => dayOfWeek(today()) === 0;

/** [colour, soft colour] for a subject; read at render time so it follows the theme */
export const colorForSubject = (subject: string): [string, string] => {
  const palette: [string, string][] = [
    [colors.primary, colors.primarySoft], [colors.info, colors.infoSoft], [colors.success, colors.successSoft],
    [colors.warning, colors.warningSoft], [colors.purple, colors.purpleSoft],
  ];
  return palette[Math.max(0, SUBJECTS.indexOf(subject)) % palette.length]!;
};

/** Periods of one day; `mode` decides whether each row shows the teacher or the class */
export function DayPeriods({ entries, mode, now }: { entries: TimetableEntry[]; mode: 'teacher' | 'class'; now?: boolean }) {
  const { data } = useStore();
  const sorted = [...entries].sort((a, b) => a.period - b.period);
  if (!sorted.length) return <EmptyState icon="cafe-outline" text={t('No periods')} />;

  const nowHM = new Date().toTimeString().slice(0, 5);
  return (
    <>
      {sorted.map((e, i) => {
        const p = PERIODS[e.period - 1]!;
        const [fg, bg] = colorForSubject(e.subject);
        const live = now && nowHM >= p.start && nowHM < p.end;
        return (
          <View key={e.id} style={[styles.row, { paddingVertical: 10, borderBottomWidth: i === sorted.length - 1 ? 0 : 1, borderBottomColor: colors.border }]}>
            <View style={{ width: 62 }}>
              <Text style={[styles.listTitle, { fontSize: 14 }]}>{p.start}</Text>
              <Text style={[styles.muted, { fontSize: 12 }]}>{p.end}</Text>
            </View>
            <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: fg, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{t(e.subject)}</Text>
              <Text style={styles.muted}>
                {t('Period')} {e.period} · {mode === 'teacher' ? (e.teacherId ? userName(data, e.teacherId) : t('No teacher')) : className(data, e.classId)}
              </Text>
            </View>
            {live ? <Badge text={t('Now')} color={colors.success} soft={colors.successSoft} /> : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: bg }} />}
          </View>
        );
      })}
    </>
  );
}

/** Day picker + periods, used by parents (a class) and teachers (their own periods) */
export function WeekTimetable({ filter, mode }: { filter: (e: TimetableEntry) => boolean; mode: 'teacher' | 'class' }) {
  const { data } = useStore();
  const [day, setDay] = useState(currentSchoolDay());
  const entries = data.timetable.filter((e) => e.day === day && filter(e));
  return (
    <>
      <Chips
        options={DAYS.map((d, i) => ({ label: t(d.slice(0, 3)), value: String(i + 1) }))}
        value={String(day)}
        onChange={(v) => setDay(Number(v))}
      />
      <Card style={{ paddingVertical: 6 }}>
        <Text style={[styles.listTitle, { paddingTop: 8 }]}>
          {t(DAYS[day - 1]!)}{day === dayOfWeek(today()) ? ` · ${t('Today')}` : ''}
        </Text>
        <DayPeriods entries={entries} mode={mode} now={day === dayOfWeek(today())} />
      </Card>
    </>
  );
}
