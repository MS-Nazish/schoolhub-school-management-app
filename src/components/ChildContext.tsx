// Which child a parent is currently looking at, shared across the parent tabs
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { createContext, useContext, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from './theme';
import { Avatar, Chips, styles } from './ui';
import { className, useStore } from '@/data/store';
import type { Student } from '@/data/types';
import { t } from '@/lib/i18n';

const Ctx = createContext<{ childId: string; setChildId: (id: string) => void } | null>(null);

export function ChildProvider({ children }: { children: React.ReactNode }) {
  const [childId, setChildId] = useState('');
  return <Ctx.Provider value={{ childId, setChildId }}>{children}</Ctx.Provider>;
}

/** Returns the parent's children and the currently selected one */
export function useChild() {
  const { data, user } = useStore();
  const ctx = useContext(Ctx)!;
  const kids = data.students.filter((s) => s.parentId === user?.id);
  const child: Student | undefined = kids.find((k) => k.id === ctx.childId) ?? kids[0];
  return { kids, child, setChildId: ctx.setChildId };
}

export function ChildSwitcher() {
  const { data } = useStore();
  const { kids, child, setChildId } = useChild();
  if (!child) return null;
  return (
    <>
      {kids.length > 1 && (
        <Chips options={kids.map((k) => ({ label: k.name.split(' ')[0]!, value: k.id }))} value={child.id} onChange={setChildId} />
      )}
      <Pressable onPress={() => router.push(`/student/${child.id}`)}
        style={({ pressed }) => [styles.card, styles.row, { backgroundColor: colors.header, opacity: pressed ? 0.9 : 1 }]}>
        <Avatar name={child.name} size={52} color="#818CF8" photo={child.photo} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{child.name}</Text>
          <Text style={{ color: '#C7D2FE' }}>{className(data, child.classId)} · {t('Roll')} #{child.rollNo}</Text>
          <Text style={{ color: '#C7D2FE', fontSize: 12, marginTop: 2 }}>{t('Tap to view full profile')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#C7D2FE" />
      </Pressable>
    </>
  );
}
