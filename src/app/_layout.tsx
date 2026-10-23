import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/components/theme';
import { StoreProvider, useStore } from '@/data/store';
import { t } from '@/lib/i18n';

function AppStack() {
  const { isDark } = useStore();
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: colors.primary, background: colors.bg, card: colors.card, text: colors.text, border: colors.border },
  };
  const header = {
    headerShown: true,
    headerStyle: { backgroundColor: colors.header },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '700' as const },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="settings" options={{ ...header, title: t('Settings') }} />
        <Stack.Screen name="notifications" options={{ ...header, title: t('Notifications') }} />
        <Stack.Screen name="chat/[id]" options={{ ...header, title: t('Chat') }} />
        <Stack.Screen name="student/[id]" options={{ ...header, title: t('Student Profile') }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <AppStack />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
