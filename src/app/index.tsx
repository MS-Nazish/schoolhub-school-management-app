import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/components/theme';
import { useStore } from '@/data/store';

/** Sends the user to the right home screen for their role */
export default function Index() {
  const { loaded, user } = useStore();

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  return <Redirect href={`/${user.role}`} />;
}
