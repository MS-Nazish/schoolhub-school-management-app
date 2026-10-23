/**
 * Phone alerts (local notifications).
 *
 * In-app notifications are stored in the data store; this module shows them as real
 * phone alerts on Android/iOS. Alerts between different phones need a server
 * (Firebase Cloud Messaging) on top of this.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const pushSupported = Platform.OS !== 'web';

let ready = false;

async function setup() {
  if (ready || !pushSupported) return ready;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'School alerts',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  ready = true;
  return ready;
}

/** Ask for permission; returns true when alerts can be shown */
export async function requestPushPermission() {
  if (!pushSupported) return false;
  try {
    await setup();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

export async function showPhoneAlert(title: string, body: string) {
  if (!pushSupported) return;
  try {
    if (!(await requestPushPermission())) return;
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    // Alerts are best effort; the in-app notification list still has the item
  }
}
