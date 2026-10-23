import { Alert, Platform } from 'react-native';

import { t } from './i18n';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const pad = (n: number) => String(n).padStart(2, '0');

/** Local date as YYYY-MM-DD */
export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toDateStr(new Date());
export const monthStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const thisMonth = () => monthStr(new Date());

const parse = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
};

export const addDays = (date: string, days: number) => {
  const dt = parse(date);
  dt.setDate(dt.getDate() + days);
  return toDateStr(dt);
};

/** Month after `month` (YYYY-MM) */
export const nextMonth = (month: string) => {
  const dt = parse(month);
  dt.setMonth(dt.getMonth() + 1);
  return monthStr(dt);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const formatDate = (date: string) => {
  const dt = parse(date);
  return `${t(DAYS[dt.getDay()])}, ${dt.getDate()} ${t(MONTHS[dt.getMonth()])} ${dt.getFullYear()}`;
};

export const formatMonth = (month: string) => {
  const dt = parse(month);
  return `${t(MONTHS[dt.getMonth()])} ${dt.getFullYear()}`;
};

/** 1 = Monday … 6 = Saturday, 0 = Sunday */
export const dayOfWeek = (date: string) => parse(date).getDay();

export const isWeekend = (date: string) => {
  const day = dayOfWeek(date);
  return day === 0 || day === 6;
};

export const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t('just now');
  if (mins < 60) return t('{n} min ago', { n: mins });
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return t('{n} h ago', { n: hrs });
  return toDateStr(new Date(iso));
};

export const clock = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const className = (data: { classes: { id: string; name: string }[] }, classId: string) =>
  data.classes.find((c) => c.id === classId)?.name ?? '—';

export const money =(n: number) => `Rs ${n.toLocaleString('en-US')}`;

export const grade = (pct: number) =>
  pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

/** Alert that also works on web */
export const notify = (title: string, message?: string) => {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
};

/** Confirmation dialog that also works on web */
export const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: t('Cancel'), style: 'cancel' },
    { text: t('OK'), style: 'destructive', onPress: onConfirm },
  ]);
};
