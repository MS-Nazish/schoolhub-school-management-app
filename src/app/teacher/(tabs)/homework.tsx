import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { HomeworkCard } from '@/components/HomeworkCard';
import { colors } from '@/components/theme';
import { Button, Card, Chips, EmptyState, Input, Screen, SectionTitle, styles } from '@/components/ui';
import { useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { addDays, confirmAction, formatDate, notify, today } from '@/lib/utils';

export default function TeacherHomework() {
  const { data, user, addHomework, deleteHomework } = useStore();
  const myClasses = data.classes.filter((c) => user?.classIds?.includes(c.id));
  const [showForm, setShowForm] = useState(false);
  const [pickedClass, setClassId] = useState('');
  // Fall back to the first class until one is picked (the user may load after this screen mounts)
  const classId = myClasses.some((c) => c.id === pickedClass) ? pickedClass : myClasses[0]?.id ?? '';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(addDays(today(), 1));

  const mine = data.homework
    .filter((h) => h.teacherId === user?.id)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  const save = () => {
    if (!title.trim()) return notify(t('Missing title'), t('Please enter a homework title.'));
    addHomework({ classId, subject: user?.subject ?? 'General', title: title.trim(), description: description.trim(), dueDate });
    setTitle('');
    setDescription('');
    setShowForm(false);
    notify(t('Homework posted'), t('Parents of this class have been notified.'));
  };

  return (
    <Screen>
      <SectionTitle
        title={t('My homework')}
        right={<Button small icon={showForm ? 'close' : 'add'} title={t(showForm ? 'Cancel' : 'New')} onPress={() => setShowForm(!showForm)} />}
      />

      {showForm && (
        <Card>
          <Text style={styles.label}>{t('Class')}</Text>
          <Chips options={myClasses.map((c) => ({ label: c.name, value: c.id }))} value={classId} onChange={setClassId} />
          <Input label={t('Title')} value={title} onChangeText={setTitle} placeholder={t('e.g. Exercise 4.1')} />
          <Input label={t('Details')} value={description} onChangeText={setDescription} placeholder={t('Instructions for students…')}
            multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
          <Text style={styles.label}>{t('Due date')}</Text>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
            <Pressable onPress={() => dueDate > today() && setDueDate(addDays(dueDate, -1))} hitSlop={10}>
              <Ionicons name="remove-circle-outline" size={28} color={colors.primary} />
            </Pressable>
            <Text style={styles.listTitle}>{formatDate(dueDate)}</Text>
            <Pressable onPress={() => setDueDate(addDays(dueDate, 1))} hitSlop={10}>
              <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
            </Pressable>
          </View>
          <Button title={t('Post homework')} icon="send" onPress={save} />
        </Card>
      )}

      {mine.length === 0 && <EmptyState icon="book-outline" text={t("You haven't posted any homework yet")} />}
      {mine.map((h) => (
        <HomeworkCard key={h.id} hw={h} showClass
          onDelete={() => confirmAction(t('Delete homework'), `${t('Remove')} "${h.title}"?`, () => deleteHomework(h.id))} />
      ))}
    </Screen>
  );
}
