/**
 * Light / dark palettes.
 *
 * `colors` is a single mutable object: when the theme changes we copy the other palette
 * into it and rebuild every stylesheet made with `themedStyles`, so components that read
 * `colors.x` or `styles.x` while rendering pick up the new theme on their next render.
 */
const light = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  accent: '#4F46E5',
  primarySoft: '#EEF2FF',
  header: '#4F46E5',
  bg: '#F5F7FB',
  card: '#FFFFFF',
  input: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  info: '#0284C7',
  infoSoft: '#E0F2FE',
  purple: '#7C3AED',
  purpleSoft: '#EDE9FE',
  bubbleMine: '#4F46E5',
  bubbleOther: '#FFFFFF',
};

const dark: typeof light = {
  primary: '#818CF8',
  primaryDark: '#6366F1',
  accent: '#6366F1',
  primarySoft: '#1E1B4B',
  header: '#1E1B4B',
  bg: '#0B1020',
  card: '#151B2E',
  input: '#1C2338',
  text: '#F3F4F6',
  muted: '#9CA3AF',
  border: '#273049',
  success: '#4ADE80',
  successSoft: '#052E16',
  danger: '#F87171',
  dangerSoft: '#450A0A',
  warning: '#FBBF24',
  warningSoft: '#451A03',
  info: '#38BDF8',
  infoSoft: '#082F49',
  purple: '#A78BFA',
  purpleSoft: '#2E1065',
  bubbleMine: '#4F46E5',
  bubbleOther: '#1C2338',
};

export const colors = { ...light };
export let isDark = false;

const listeners: (() => void)[] = [];

export function applyTheme(darkMode: boolean) {
  if (darkMode === isDark) return;
  isDark = darkMode;
  Object.assign(colors, darkMode ? dark : light);
  listeners.forEach((fn) => fn());
}

/** A stylesheet that is rebuilt whenever the theme changes */
export function themedStyles<T extends object>(factory: () => T): T {
  const styles = { ...factory() };
  listeners.push(() => Object.assign(styles, factory()));
  return styles;
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 24 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
