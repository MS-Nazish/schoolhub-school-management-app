import { router } from 'expo-router';
import { Platform, Switch, Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { Avatar, Badge, Button, Card, InfoRow, Screen, Segmented, SectionTitle, styles } from '@/components/ui';
import { SCHOOL_NAME } from '@/data/seed';
import { useStore } from '@/data/store';
import type { Lang, ThemeMode } from '@/data/types';
import { t } from '@/lib/i18n';
import { pushSupported, requestPushPermission, showPhoneAlert } from '@/lib/push';
import { confirmAction, money, notify } from '@/lib/utils';

export default function Settings() {
  const { user, settings, setTheme, setLanguage, setPushEnabled, logout, resetDemoData, cloud } = useStore();
  if (!user) return null;
  const roleColor = { admin: colors.purple, teacher: colors.info, parent: colors.success };

  const changeLang = (lang: Lang) => {
    if (lang === settings.lang) return;
    setLanguage(lang);
    if (Platform.OS !== 'web') {
      notify(t('Language changed'), t('Close and reopen the app to switch the layout direction.'));
    }
  };

  const togglePush = async (on: boolean) => {
    if (on && pushSupported && !(await requestPushPermission())) {
      return notify(t('Permission needed'), t('Please allow notifications for SchoolHub in your phone settings.'));
    }
    setPushEnabled(on);
  };

  return (
    <Screen>
      <Card style={{ alignItems: 'center' }}>
        <Avatar name={user.name} size={72} color={roleColor[user.role]} />
        <Text style={[styles.h1, { fontSize: 20, marginTop: 10 }]}>{user.name}</Text>
        <Text style={styles.muted}>{user.email}</Text>
        <View style={{ marginTop: 8 }}>
          <Badge text={t(user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Teacher' : 'Parent')} color={roleColor[user.role]} soft={colors.bg} />
        </View>
        {user.role === 'teacher' && (
          <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
            <InfoRow icon="book-outline" label={t('Subject')} value={t(user.subject ?? '—')} />
            <InfoRow icon="call-outline" label={t('Phone')} value={user.phone ?? '—'} />
            <InfoRow icon="cash-outline" label={t('Monthly salary')} value={money(user.salary ?? 0)} />
          </View>
        )}
      </Card>

      <SectionTitle title={t('Appearance')} />
      <Card>
        <Text style={[styles.label, { marginBottom: 10 }]}>{t('Theme')}</Text>
        <Segmented<ThemeMode>
          value={settings.theme}
          onChange={setTheme}
          options={[
            { label: t('System'), value: 'system', icon: 'phone-portrait-outline' },
            { label: t('Light'), value: 'light', icon: 'sunny-outline' },
            { label: t('Dark'), value: 'dark', icon: 'moon-outline' },
          ]}
        />
        <Text style={[styles.label, { marginTop: 18, marginBottom: 10 }]}>{t('Language')}</Text>
        <Segmented<Lang>
          value={settings.lang}
          onChange={changeLang}
          options={[{ label: 'English', value: 'en' }, { label: 'اردو', value: 'ur' }]}
        />
      </Card>

      <SectionTitle title={t('Notifications')} />
      <Card>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.listTitle}>{t('Phone alerts')}</Text>
            <Text style={styles.muted}>
              {pushSupported ? t('Get alerts for absence, homework, results, fees and messages.') : t('Phone alerts work in the mobile app, not in the browser.')}
            </Text>
          </View>
          <Switch value={settings.pushEnabled} onValueChange={togglePush}
            trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#fff" />
        </View>
        {pushSupported && settings.pushEnabled && (
          <Button small variant="outline" icon="notifications-outline" title={t('Send test alert')} style={{ marginTop: 12 }}
            onPress={() => showPhoneAlert(SCHOOL_NAME, t('Notifications are working!'))} />
        )}
      </Card>

      {user.role === 'admin' && (
        <>
          <SectionTitle title={t('Demo')} />
          <Button variant="outline" icon="refresh" title={t('Reset demo data')} style={{ marginBottom: 12 }}
            onPress={() => confirmAction(t('Reset demo data'), t('This will erase all changes and restore the sample data.'), () => {
              resetDemoData();
              notify(t('Done'), t('Demo data has been restored.'));
            })} />
        </>
      )}

      <Button variant="danger" icon="log-out-outline" title={t('Log out')} style={{ marginTop: 8 }}
        onPress={() => confirmAction(t('Log out'), t('Do you want to log out?'), () => {
          logout();
          router.replace('/login');
        })} />

      <Text style={[styles.muted, { textAlign: 'center', marginTop: 20 }]}>
        {SCHOOL_NAME} v1.2.0 · {cloud ? t('Online · synced with Firebase') : t('Offline demo · saved on this device')}
      </Text>
    </Screen>
  );
}
