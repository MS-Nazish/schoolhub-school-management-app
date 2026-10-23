import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { colors } from './theme';
import { Badge, Card, IconButton, styles } from './ui';
import { className, useStore } from '@/data/store';
import type { Homework } from '@/data/types';
import { t } from '@/lib/i18n';
import { formatDate, today } from '@/lib/utils';

export function HomeworkCard({ hw, showClass, onDelete }: { hw: Homework; showClass?: boolean; onDelete?: () => void }) {
  const { data } = useStore();
  const overdue = hw.dueDate < today();
  const dueToday = hw.dueDate === today();
  const teacher = data.users.find((u) => u.id === hw.teacherId);

  return (
    <Card>
      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 6 }]}>
        <Badge text={t(hw.subject)} />
        <View style={[styles.row, { gap: 8 }]}>
          {showClass && <Text style={styles.muted}>{className(data, hw.classId)}</Text>}
          {onDelete && <IconButton icon="trash-outline" color={colors.danger} onPress={onDelete} />}
        </View>
      </View>
      <Text style={[styles.listTitle, { fontSize: 16 }]}>{hw.title}</Text>
      {!!hw.description && <Text style={[styles.body, { marginTop: 4 }]}>{hw.description}</Text>}
      <View style={[styles.row, { justifyContent: 'space-between', marginTop: 10 }]}>
        <View style={[styles.row, { gap: 4, flex: 1 }]}>
          <Ionicons name="calendar-outline" size={14} color={overdue ? colors.danger : colors.muted} />
          <Text style={[styles.muted, overdue && { color: colors.danger }]}>{t('Due')} {formatDate(hw.dueDate)}</Text>
        </View>
        {overdue ? (
          <Badge text={t('Past due')} color={colors.danger} soft={colors.dangerSoft} />
        ) : dueToday ? (
          <Badge text={t('Due today')} color={colors.warning} soft={colors.warningSoft} />
        ) : (
          !showClass && teacher && <Text style={styles.muted}>{teacher.name}</Text>
        )}
      </View>
    </Card>
  );
}
