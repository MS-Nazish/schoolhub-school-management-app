// Student + parent details form, shared by "Add student" and "Edit student"
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { DateInput, dmyToIso } from './DateInput';
import { colors } from './theme';
import { Chips, Input, Segmented, styles } from './ui';
import { useStore } from '@/data/store';
import { t } from '@/lib/i18n';

export interface StudentFormValues {
  name: string;
  classId: string;
  rollNo: string;
  gender: '' | 'Male' | 'Female';
  dob: string; // DD-MM-YYYY
  admissionDate: string; // DD-MM-YYYY
  address: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
}

export function StudentForm({ value, onChange, parentEmailLocked }: {
  value: StudentFormValues;
  onChange: (v: StudentFormValues) => void;
  /** The parent's email is their login once the account exists */
  parentEmailLocked?: boolean;
}) {
  const { data } = useStore();
  const set = (patch: Partial<StudentFormValues>) => onChange({ ...value, ...patch });

  return (
    <>
      <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 10 }]}>👦 {t('Student')}</Text>
      <Input label={t('Student name')} value={value.name} onChangeText={(name) => set({ name })} placeholder="e.g. Ahmed Raza" />
      <Text style={styles.label}>{t('Class')}</Text>
      <Chips options={data.classes.map((c) => ({ label: c.name, value: c.id }))} value={value.classId} onChange={(classId) => set({ classId })} />
      <Input label={t('Roll number')} value={value.rollNo} onChangeText={(v) => set({ rollNo: v.replace(/[^0-9]/g, '') })}
        keyboardType="number-pad" placeholder={t('Leave empty for next number')} />
      <Text style={[styles.label, { marginBottom: 8 }]}>{t('Gender')}</Text>
      <View style={{ marginBottom: 12 }}>
        <Segmented<'Male' | 'Female'>
          value={value.gender as 'Male' | 'Female'}
          onChange={(gender) => set({ gender })}
          options={[{ label: t('Male'), value: 'Male', icon: 'male' }, { label: t('Female'), value: 'Female', icon: 'female' }]}
        />
      </View>
      <View style={[styles.row, { gap: 10 }]}>
        <View style={{ flex: 1 }}>
          <DateInput label={t('Date of birth')} value={value.dob} onChange={(dob) => set({ dob })} />
        </View>
        <View style={{ flex: 1 }}>
          <DateInput label={t('Admission date')} value={value.admissionDate} onChange={(admissionDate) => set({ admissionDate })} />
        </View>
      </View>
      <Input label={t('Address')} value={value.address} onChangeText={(address) => set({ address })}
        placeholder={t('House, street, city')} multiline style={{ minHeight: 60, textAlignVertical: 'top' }} />

      <Text style={[styles.sectionTitle, { fontSize: 15, marginTop: 6, marginBottom: 10 }]}>👨‍👩‍👧 {t('Parent / Guardian')}</Text>
      <Input label={t('Parent name')} value={value.parentName} onChangeText={(parentName) => set({ parentName })} placeholder="e.g. Mr. Raza" />
      {parentEmailLocked ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>{t('Parent email (login)')}</Text>
          <View style={[styles.input, styles.row, { gap: 8, opacity: 0.7 }]}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
            <Text style={{ color: colors.text, flex: 1 }}>{value.parentEmail}</Text>
          </View>
        </View>
      ) : (
        <Input label={t('Parent email (login)')} value={value.parentEmail} onChangeText={(parentEmail) => set({ parentEmail })}
          placeholder="parent@email.com" autoCapitalize="none" keyboardType="email-address" />
      )}
      <Input label={t('Parent phone')} value={value.parentPhone} onChangeText={(parentPhone) => set({ parentPhone })}
        keyboardType="phone-pad" placeholder="03xx-xxxxxxx" />
    </>
  );
}

/** Returns an error message, or null when the form is valid */
export function validateStudent(v: StudentFormValues): string | null {
  if (!v.name.trim()) return t('Please enter the student name.');
  if (!v.classId) return t('Please select a class.');
  if (!v.parentName.trim() || !v.parentEmail.trim()) return t('Parent name and email are required.');
  if (v.dob && !dmyToIso(v.dob)) return t('Date of birth is not a valid date (DD-MM-YYYY).');
  if (v.admissionDate && !dmyToIso(v.admissionDate)) return t('Admission date is not a valid date (DD-MM-YYYY).');
  return null;
}
