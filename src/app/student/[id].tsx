import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { Avatar, Badge, Banner, Button, Card, EmptyState, InfoRow, ProgressBar, Screen, SectionTitle, StatCard, StatGrid, styles } from '@/components/ui';
import { EXAMS } from '@/data/seed';
import { attendanceStats, className, useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { shareReportCard } from '@/lib/reportCard';
import { formatDate, formatMonth, grade, money, notify } from '@/lib/utils';

export default function StudentProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, user, updateStudent } = useStore();
  const [busy, setBusy] = useState(false);
  const student = data.students.find((s) => s.id === id);

  // Admin sees everyone; parents only their children; teachers only their classes
  const allowed = !!student && !!user && (
    user.role === 'admin'
    || (user.role === 'parent' && student.parentId === user.id)
    || (user.role === 'teacher' && !!user.classIds?.includes(student.classId))
  );
  if (!student || !allowed) return <Screen><EmptyState text={t('Student not found')} /></Screen>;

  const canEditPhoto = user!.role === 'admin' || user!.role === 'parent';
  const parent = data.users.find((u) => u.id === student.parentId);
  const att = attendanceStats(data, student.id);
  const results = data.results.filter((r) => r.studentId === student.id);
  const avg = results.length ? Math.round(results.reduce((s, r) => s + (r.marks / r.total) * 100, 0) / results.length) : null;
  const fees = data.fees.filter((f) => f.studentId === student.id).sort((a, b) => b.month.localeCompare(a.month));
  const unpaid = fees.filter((f) => f.status === 'unpaid').reduce((s, f) => s + f.amount, 0);
  const latestExam = [...EXAMS].reverse().find((e) => results.some((r) => r.exam === e));

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return notify(t('Permission needed'), t('Please allow photo access to set a profile picture.'));
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    // Save as a data URI so the photo survives restarts and can go in the PDF
    const photo = a.base64 ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}` : a.uri;
    updateStudent(student.id, { photo });
  };

  const downloadReport = async () => {
    setBusy(true);
    try {
      await shareReportCard(data, student);
    } catch (e) {
      notify(t('Could not create PDF'), e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  return (
    <Screen>
      <Card style={{ alignItems: 'center', backgroundColor: colors.header }}>
        <Pressable onPress={canEditPhoto ? pickPhoto : undefined} disabled={!canEditPhoto}>
          <Avatar name={student.name} size={96} photo={student.photo} color="#818CF8" />
          {canEditPhoto && (
            <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.accent, borderRadius: 16, padding: 7, borderWidth: 2, borderColor: '#fff' }}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          )}
        </Pressable>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 12 }}>{student.name}</Text>
        <Text style={{ color: '#C7D2FE', marginTop: 2 }}>{className(data, student.classId)} · {t('Roll')} #{student.rollNo}</Text>
        {canEditPhoto && <Text style={{ color: '#C7D2FE', fontSize: 12, marginTop: 6 }}>{t('Tap the photo to change it')}</Text>}
      </Card>

      <StatGrid>
        <StatCard icon="calendar" label={t('Attendance')} value={`${att.pct}%`} color={colors.success} soft={colors.successSoft} />
        <StatCard icon="ribbon" label={t('Average marks')} value={avg === null ? '—' : `${avg}%`} color={colors.info} soft={colors.infoSoft} />
      </StatGrid>

      {user!.role === 'admin' && (
        <Button title={t('Edit details')} icon="person-outline" style={{ marginBottom: 10 }}
          onPress={() => router.push(`/admin/student/${student.id}`)} />
      )}
      {user!.role !== 'parent' && (
        <Button title={t('Enter / edit marks (marksheet)')} icon="create-outline" variant="outline" style={{ marginBottom: 10 }}
          onPress={() => router.push(`/marksheet/${student.id}?exam=${encodeURIComponent(latestExam ?? EXAMS[1]!)}`)} />
      )}
      <Button title={t('Download report card (PDF)')} icon="document-text-outline" onPress={downloadReport} loading={busy} style={{ marginBottom: 16 }} />

      <SectionTitle title={t('Personal details')} right={user!.role === 'admin'
        ? <Button small variant="ghost" icon="create-outline" title={t('Edit')} onPress={() => router.push(`/admin/student/${student.id}`)} />
        : undefined} />
      {user!.role === 'admin' && (!student.dob || !student.gender || !student.address) && (
        <Banner icon="information-circle-outline" color={colors.warning} soft={colors.warningSoft}
          text={t('Some details are missing. Tap "Edit details" to add them.')} onPress={() => router.push(`/admin/student/${student.id}`)} />
      )}
      <Card style={{ paddingVertical: 6 }}>
        <InfoRow icon="calendar-outline" label={t('Date of birth')} value={student.dob ? formatDate(student.dob) : '—'} />
        <InfoRow icon="male-female-outline" label={t('Gender')} value={student.gender ? t(student.gender) : '—'} />
        <InfoRow icon="school-outline" label={t('Admission date')} value={student.admissionDate ? formatDate(student.admissionDate) : '—'} />
        <InfoRow icon="home-outline" label={t('Address')} value={student.address ?? '—'} />
      </Card>

      <SectionTitle title={t('Parent / Guardian')} />
      <Card style={{ paddingVertical: 6 }}>
        <InfoRow icon="person-outline" label={t('Name')} value={parent?.name ?? '—'} />
        <InfoRow icon="call-outline" label={t('Phone')} value={parent?.phone ?? '—'} />
        <InfoRow icon="mail-outline" label={t('Email')} value={parent?.email ?? '—'} />
        {user!.role === 'teacher' && parent && (
          <Button small variant="outline" icon="chatbubble-outline" title={t('Message parent')} style={{ marginVertical: 10 }}
            onPress={() => router.push(`/chat/${parent.id}`)} />
        )}
      </Card>

      <SectionTitle title={t('Attendance')} />
      <Card>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={styles.body}>{t('Present')} {att.present} · {t('Absent')} {att.absent} · {t('Leave')} {att.leave}</Text>
          <Text style={[styles.listTitle, { color: att.pct >= 85 ? colors.success : colors.warning }]}>{att.pct}%</Text>
        </View>
        <ProgressBar pct={att.pct} color={att.pct >= 85 ? colors.success : colors.warning} />
      </Card>

      {latestExam && (
        <>
          <SectionTitle title={`${t('Latest result')}: ${t(latestExam)}`} />
          <Card style={{ paddingVertical: 6 }}>
            {results.filter((r) => r.exam === latestExam).map((r) => {
              const p = Math.round((r.marks / r.total) * 100);
              return (
                <View key={r.id} style={[styles.row, { paddingVertical: 8 }]}>
                  <Text style={[styles.body, { flex: 1 }]}>{t(r.subject)}</Text>
                  <Text style={[styles.body, { fontWeight: '700', width: 70, textAlign: 'right' }]}>{r.marks}/{r.total}</Text>
                  <Text style={{ width: 36, textAlign: 'right', fontWeight: '800', color: colors.primary }}>{grade(p)}</Text>
                </View>
              );
            })}
          </Card>
        </>
      )}

      {user!.role !== 'teacher' && (
        <>
          <SectionTitle title={t('Fees')} right={unpaid ? <Badge text={`${t('Due')} ${money(unpaid)}`} color={colors.danger} soft={colors.dangerSoft} /> : undefined} />
          <Card style={{ paddingVertical: 6 }}>
            {fees.length === 0 && <EmptyState text={t('No fee records')} />}
            {fees.map((f) => (
              <View key={f.id} style={[styles.row, { justifyContent: 'space-between', paddingVertical: 8 }]}>
                <Text style={styles.body}>{formatMonth(f.month)} · {money(f.amount)}</Text>
                <Badge text={t(f.status === 'paid' ? 'Paid' : 'Unpaid')}
                  color={f.status === 'paid' ? colors.success : colors.danger} soft={f.status === 'paid' ? colors.successSoft : colors.dangerSoft} />
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
