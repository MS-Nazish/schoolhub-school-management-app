import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';

import { colors, radius, space, themedStyles } from './theme';
import { initials } from '@/lib/utils';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={[styles.screen, styles.screenPad]}>{children}</View>;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style as ViewStyle]}>{children}</View>;
}

export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

type ButtonVariant = 'primary' | 'outline' | 'danger' | 'ghost' | 'success';

export function Button({
  title, onPress, variant = 'primary', icon, loading, disabled, small, style,
}: {
  title: string; onPress: () => void; variant?: ButtonVariant; icon?: IconName;
  loading?: boolean; disabled?: boolean; small?: boolean; style?: ViewStyle;
}) {
  const bg = {
    primary: colors.accent, outline: 'transparent', danger: colors.danger, ghost: 'transparent', success: colors.success,
  }[variant];
  const solid = variant === 'primary' || variant === 'danger' || variant === 'success';
  const fg = solid ? '#fff' : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.primary },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={fg} style={{ marginRight: 6 }} />}
          <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ label, style, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: space.md }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...props} />
    </View>
  );
}

export function StatCard({ icon, label, value, color = colors.primary, soft = colors.primarySoft, onPress }: {
  icon: IconName; label: string; value: string | number; color?: string; soft?: string; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.stat, pressed && { opacity: 0.8 }]}>
      <View style={[styles.statIcon, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.statGrid}>{children}</View>;
}

/** Grid of square shortcut buttons */
export function QuickActions({ items }: { items: { icon: IconName; label: string; color: string; soft: string; onPress: () => void; badge?: number }[] }) {
  return (
    <View style={styles.quickGrid}>
      {items.map((it) => (
        <Pressable key={it.label} onPress={it.onPress} style={({ pressed }) => [styles.quick, pressed && { opacity: 0.7 }]}>
          <View style={[styles.quickIcon, { backgroundColor: it.soft }]}>
            <Ionicons name={it.icon} size={22} color={it.color} />
            {!!it.badge && <CountBadge count={it.badge} style={{ position: 'absolute', top: -6, right: -8 }} />}
          </View>
          <Text style={styles.quickLabel} numberOfLines={1}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Badge({ text, color = colors.primary, soft = colors.primarySoft }: { text: string; color?: string; soft?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: soft }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function CountBadge({ count, style }: { count: number; style?: ViewStyle }) {
  if (!count) return null;
  return (
    <View style={[styles.countBadge, style]}>
      <Text style={styles.countBadgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange }: {
  options: { label: string; value: T }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md, flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && { color: '#fff' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Equal-width segmented choice, used in settings */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { label: string; value: T; icon?: IconName }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segmentItem, on && { backgroundColor: colors.accent }]}>
            {o.icon && <Ionicons name={o.icon} size={16} color={on ? '#fff' : colors.muted} style={{ marginBottom: 2 }} />}
            <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({ name, size = 40, color = colors.accent, photo }: { name: string; size?: number; color?: string; photo?: string }) {
  if (photo) {
    return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.border }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  );
}

export function ListItem({ title, subtitle, left, right, onPress, last }: {
  title: string; subtitle?: string; left?: React.ReactNode; right?: React.ReactNode; onPress?: () => void; last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}
      style={({ pressed }) => [styles.listItem, last && { borderBottomWidth: 0 }, pressed && onPress && { opacity: 0.7 }]}>
      {left}
      <View style={{ flex: 1, marginLeft: left ? space.md : 0 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.listSub}>{subtitle}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

export function EmptyState({ icon = 'file-tray-outline', text }: { icon?: IconName; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.muted} style={{ opacity: 0.5 }} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function IconButton({ icon, onPress, color = colors.muted, size = 20 }: { icon: IconName; onPress: () => void; color?: string; size?: number }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.5 : 1 })}>
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function Banner({ icon, text, color, soft, onPress }: { icon: IconName; text: string; color: string; soft: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.banner, { backgroundColor: soft }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.bannerText, { color }]}>{text}</Text>
      {onPress && <Ionicons name="chevron-forward" size={18} color={color} />}
    </Pressable>
  );
}

export function ProgressBar({ pct, color = colors.primary }: { pct: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }]} />
    </View>
  );
}

export function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={[styles.row, { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.muted} style={{ width: 28 }} />
      <Text style={[styles.muted, { flex: 1, fontSize: 14 }]}>{label}</Text>
      <Text style={[styles.body, { fontWeight: '600', flexShrink: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

const shadow = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 };

export const styles = themedStyles(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenPad: { padding: space.lg, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, marginBottom: space.md, ...shadow },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm, marginBottom: space.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, paddingHorizontal: space.lg, borderRadius: radius.md,
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: space.md },
  buttonText: { fontSize: 15, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.input,
    paddingHorizontal: space.md, paddingVertical: 11, fontSize: 15, color: colors.text,
  },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginBottom: space.md },
  stat: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, ...shadow },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted, marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  quick: {
    flexBasis: '22%', flexGrow: 1, alignItems: 'center', paddingVertical: space.md, backgroundColor: colors.card,
    borderRadius: radius.lg, ...shadow,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  countBadge: {
    minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  segment: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: 4, gap: 4 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  listTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  listSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { alignItems: 'center', padding: space.xl },
  emptyText: { color: colors.muted, marginTop: space.sm, textAlign: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md, borderRadius: radius.md, marginBottom: space.md },
  bannerText: { flex: 1, fontWeight: '600', fontSize: 14 },
  progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: 8, borderRadius: 4 },
  muted: { color: colors.muted, fontSize: 13 },
  body: { color: colors.text, fontSize: 14, lineHeight: 20 },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center' },
}));
