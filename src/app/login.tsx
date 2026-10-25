import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space, themedStyles } from '@/components/theme';
import { Button, Input } from '@/components/ui';
import { DEMO_ACCOUNTS, SCHOOL_NAME } from '@/data/seed';
import { useStore } from '@/data/store';
import { t } from '@/lib/i18n';

const roleInfo = {
  admin: { label: 'Admin', icon: 'shield-checkmark' as const, color: () => colors.purple },
  teacher: { label: 'Teacher', icon: 'school' as const, color: () => colors.info },
  parent: { label: 'Parent', icon: 'people' as const, color: () => colors.success },
};

export default function Login() {
  const { login, user, loaded, settings, setLanguage, cloud, checkEmptyDatabase, setupDemoSchool, sendPasswordReset } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [emptyDb, setEmptyDb] = useState(false);
  const [setupMsg, setSetupMsg] = useState('');

  // A brand-new Firebase project has no data or logins yet: offer to create the demo school
  useEffect(() => {
    if (cloud) checkEmptyDatabase().then(setEmptyDb).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloud]);

  if (loaded && user) return <Redirect href={`/${user.role}`} />;

  const submit = async () => {
    setError('');
    if (!email || !password) return setError(t('Please enter email and password'));
    setBusy(true);
    const err = await login(email, password);
    setBusy(false);
    if (err) return setError(emptyDb ? t('No accounts exist yet. Click "Set up demo school" first.') : err);
    // The redirect above takes over once the profile has loaded
    router.replace('/');
  };

  const forgotPassword = async () => {
    setError('');
    setSetupMsg('');
    if (!cloud) return setError(t('Offline demo: ask the school admin to set a new password for you.'));
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t('Type your email above, then tap "Forgot password?" again.'));
    setBusy(true);
    const err = await sendPasswordReset(email);
    setBusy(false);
    if (err) return setError(err);
    setSetupMsg(t('If an account exists for {email}, a reset link has been sent. Check your inbox and spam folder.', { email: email.trim() }));
  };

  const setupDemo = async () => {
    setBusy(true);
    setError('');
    try {
      await setupDemoSchool(setSetupMsg);
      setEmptyDb(false);
      setSetupMsg(t('Demo school is ready. Use a demo login below.'));
    } catch (e) {
      setSetupMsg('');
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <Pressable style={s.langBtn} onPress={() => setLanguage(settings.lang === 'ur' ? 'en' : 'ur')}>
            <Ionicons name="language" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>{settings.lang === 'ur' ? 'English' : 'اردو'}</Text>
          </Pressable>

          <View style={s.hero}>
            <View style={s.logo}>
              <Ionicons name="school" size={40} color={colors.accent} />
            </View>
            <Text style={s.appName}>{SCHOOL_NAME}</Text>
            <Text style={s.tagline}>{t('Smart School Management')}</Text>
          </View>

          <View style={s.card}>
            <Text style={s.title}>{t('Welcome back')} 👋</Text>
            <Text style={s.subtitle}>{t('Sign in to continue')}</Text>

            {cloud && emptyDb && (
              <View style={s.setupBox}>
                <Text style={s.setupTitle}>⚠️ {t('Step 1: Set up the demo school')}</Text>
                <Text style={s.setupText}>{t('The database is empty. Create the demo school (students, teachers, timetable…) and the demo logins?')}</Text>
                <Button icon="cloud-upload-outline" title={t('Set up demo school')} onPress={setupDemo} loading={busy && !!setupMsg} disabled={busy} />
              </View>
            )}
            {!!setupMsg && <Text style={s.setupMsg}>{setupMsg}</Text>}

            <Input label={t('Email')} value={email} onChangeText={setEmail} placeholder="you@school.com"
              autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Input label={t('Password')} value={password} onChangeText={setPassword} placeholder="••••••••"
              secureTextEntry onSubmitEditing={submit} />
            <Pressable onPress={forgotPassword} disabled={busy} style={s.forgot} accessibilityRole="button">
              <Text style={s.forgotText}>{t('Forgot password?')}</Text>
            </Pressable>

            {!!error && <Text style={s.error}>{error}</Text>}
            <Button title={t('Sign In')} onPress={submit} icon="log-in-outline" loading={busy && !setupMsg} disabled={busy} />

            <Text style={s.demoTitle}>{t('Quick demo login')}</Text>
            <View style={s.demoRow}>
              {DEMO_ACCOUNTS.map((a) => {
                const info = roleInfo[a.role];
                const c = info.color();
                return (
                  <Pressable
                    key={a.role}
                    style={({ pressed }) => [s.demoBtn, { borderColor: c, opacity: pressed ? 0.7 : 1 }]}
                    onPress={() => { setEmail(a.email); setPassword(a.password); setError(''); }}
                  >
                    <Ionicons name={info.icon} size={22} color={c} />
                    <Text style={[s.demoLabel, { color: c }]}>{t(info.label)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = themedStyles(() => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.header },
  container: { flexGrow: 1, justifyContent: 'center', padding: space.lg, width: '100%', maxWidth: 480, alignSelf: 'center' },
  langBtn: {
    alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: space.md,
  },
  hero: { alignItems: 'center', marginBottom: space.xl },
  logo: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  appName: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: space.md },
  tagline: { color: '#C7D2FE', fontSize: 15, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: space.xl },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.muted, marginBottom: space.lg, marginTop: 4 },
  forgot: { alignSelf: 'flex-end', marginTop: -6, marginBottom: space.md, paddingVertical: 4 },
  forgotText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  error: { color: colors.danger, marginBottom: space.md, fontWeight: '600' },
  setupBox: { marginBottom: space.lg, padding: space.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, gap: 8 },
  setupTitle: { fontWeight: '800', color: colors.primary },
  setupText: { color: colors.text, fontSize: 13, lineHeight: 18 },
  setupMsg: { marginTop: space.md, textAlign: 'center', color: colors.success, fontWeight: '600' },
  demoTitle: { textAlign: 'center', color: colors.muted, marginTop: space.xl, marginBottom: space.md, fontSize: 13 },
  demoRow: { flexDirection: 'row', gap: space.sm },
  demoBtn: { flex: 1, alignItems: 'center', paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1.5 },
  demoLabel: { fontWeight: '700', marginTop: 4, fontSize: 13 },
}));
