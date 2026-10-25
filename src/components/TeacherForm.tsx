// Teacher details form, shared by "Add teacher" and "Edit teacher"
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors } from './theme';
import { Chips, Input, styles } from './ui';
import { SUBJECTS } from '@/data/seed';
import { useStore } from '@/data/store';
import { t } from '@/lib/i18n';

export interface TeacherFormValues {
  name: string;
  email: string;
  phone: string;
  salary: string;
  subject: string;
  classIds: string[];
}

export function TeacherForm({ value, onChange, emailLocked }: {
  value: TeacherFormValues;
  onChange: (v: TeacherFormValues) => void;
  /** Email is the login, so it can't change after the account exists */
  emailLocked?: boolean;
}) {
  const { data } = useStore();
  const set = (patch: Partial<TeacherFormValues>) => onChange({ ...value, ...patch });
  const toggleClass = (id: string) =>
    set({ classIds: value.classIds.includes(id) ? value.classIds.filter((c) => c !== id) : [...value.classIds, id] });

  return (
    <>
      <Input label={t('Full name')} value={value.name} onChangeText={(name) => set({ name })} placeholder="e.g. Nadia Shah" />
      {emailLocked ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>{t('Email (login)')}</Text>
          <View style={[styles.input, styles.row, { gap: 8, opacity: 0.7 }]}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
            <Text style={{ color: colors.text, flex: 1 }}>{value.email}</Text>
          </View>
          <Text style={[styles.muted, { fontSize: 12, marginTop: 4 }]}>{t('The email is the login and cannot be changed.')}</Text>
        </View>
      ) : (
        <Input label={t('Email (login)')} value={value.email} onChangeText={(email) => set({ email })}
          autoCapitalize="none" keyboardType="email-address" placeholder="teacher@school.com" />
      )}
      <Input label={t('Phone')} value={value.phone} onChangeText={(phone) => set({ phone })} keyboardType="phone-pad" placeholder="03xx-xxxxxxx" />
      <Input label={t('Monthly salary (Rs)')} value={value.salary} onChangeText={(v) => set({ salary: v.replace(/[^0-9]/g, '') })}
        keyboardType="number-pad" placeholder="45000" />
      <Text style={styles.label}>{t('Subject')}</Text>
      <Chips options={SUBJECTS.map((s) => ({ label: t(s), value: s }))} value={value.subject} onChange={(subject) => set({ subject })} />
      <Text style={styles.label}>{t('Classes')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {data.classes.map((c) => {
          const on = value.classIds.includes(c.id);
          return (
            <Pressable key={c.id} onPress={() => toggleClass(c.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
                borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : colors.card }}>
              <Text style={{ color: on ? colors.primary : colors.text, fontWeight: '600' }}>{on ? '✓ ' : ''}{c.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

/** Returns an error message, or null when the form is valid */
export function validateTeacher(v: TeacherFormValues): string | null {
  if (!v.name.trim() || !v.email.trim()) return t('Name and email are required.');
  if (!v.classIds.length) return t('Select at least one class.');
  const salary = Number(v.salary);
  if (!salary || salary < 0) return t('Enter the monthly salary in rupees.');
  return null;
}
