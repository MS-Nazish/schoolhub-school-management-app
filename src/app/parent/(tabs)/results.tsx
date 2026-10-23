import { useState } from 'react';
import { Text, View } from 'react-native';

import { ChildSwitcher, useChild } from '@/components/ChildContext';
import { colors } from '@/components/theme';
import { Badge, Button, Card, EmptyState, ProgressBar, Screen, styles } from '@/components/ui';
import { EXAMS } from '@/data/seed';
import { useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { shareReportCard } from '@/lib/reportCard';
import { grade, notify } from '@/lib/utils';

const gradeColor = (pct: number) => (pct >= 80 ? colors.success : pct >= 60 ? colors.info : pct >= 50 ? colors.warning : colors.danger);

export default function ParentResults() {
  const { data } = useStore();
  const { child } = useChild();
  const [busy, setBusy] = useState(false);
  if (!child) return <Screen><EmptyState text={t('No children linked to your account')} /></Screen>;

  const mine = data.results.filter((r) => r.studentId === child.id);
  const exams = EXAMS.filter((e) => mine.some((r) => r.exam === e)).reverse();

  const download = async () => {
    setBusy(true);
    try {
      await shareReportCard(data, child);
    } catch (e) {
      notify(t('Could not create PDF'), e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  return (
    <Screen>
      <ChildSwitcher />
      <Button title={t('Download report card (PDF)')} icon="document-text-outline" onPress={download} loading={busy} style={{ marginBottom: 12 }} />
      {exams.length === 0 && <EmptyState icon="ribbon-outline" text={t('No results published yet')} />}
      {exams.map((exam) => {
        const rows = mine.filter((r) => r.exam === exam).sort((a, b) => a.subject.localeCompare(b.subject));
        const got = rows.reduce((s, r) => s + r.marks, 0);
        const total = rows.reduce((s, r) => s + r.total, 0);
        const pct = Math.round((got / total) * 100);
        return (
          <Card key={exam}>
            <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
              <Text style={[styles.listTitle, { fontSize: 17 }]}>{t(exam)}</Text>
              <Badge text={`${t('Grade')} ${grade(pct)}`} color={gradeColor(pct)} soft={colors.bg} />
            </View>
            <Text style={styles.muted}>{got} / {total} {t('marks')} · {pct}%</Text>
            <ProgressBar pct={pct} color={gradeColor(pct)} />

            <View style={{ marginTop: 12 }}>
              {rows.map((r) => {
                const p = Math.round((r.marks / r.total) * 100);
                return (
                  <View key={r.id} style={[styles.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Text style={[styles.body, { flex: 1 }]}>{t(r.subject)}</Text>
                    <Text style={[styles.body, { width: 70, textAlign: 'right', fontWeight: '700' }]}>{r.marks}/{r.total}</Text>
                    <Text style={{ width: 40, textAlign: 'right', fontWeight: '800', color: gradeColor(p) }}>{grade(p)}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
