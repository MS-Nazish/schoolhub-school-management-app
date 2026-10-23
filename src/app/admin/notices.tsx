import { useState } from 'react';
import { Text } from 'react-native';

import { NoticeList } from '@/components/shared';
import { Button, Card, Chips, Input, Screen, SectionTitle, styles } from '@/components/ui';
import { useStore } from '@/data/store';
import type { Audience } from '@/data/types';
import { t } from '@/lib/i18n';
import { confirmAction, notify } from '@/lib/utils';

export default function AdminNotices() {
  const { data, addNotice, deleteNotice } = useStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');

  const post = () => {
    if (!title.trim() || !body.trim()) return notify(t('Missing details'), t('Please add a title and message.'));
    addNotice({ title: title.trim(), body: body.trim(), audience });
    setTitle('');
    setBody('');
    notify(t('Notice posted'), t('Everyone in the audience has been notified.'));
  };

  return (
    <Screen>
      <SectionTitle title={t('Post a notice')} />
      <Card>
        <Input label={t('Title')} value={title} onChangeText={setTitle} placeholder={t('e.g. Winter vacation')} />
        <Input label={t('Message')} value={body} onChangeText={setBody} placeholder={t('Write the announcement…')}
          multiline style={{ minHeight: 90, textAlignVertical: 'top' }} />
        <Text style={styles.label}>{t('Send to')}</Text>
        <Chips<Audience>
          options={[{ label: t('Everyone'), value: 'all' }, { label: t('Parents'), value: 'parents' }, { label: t('Teachers'), value: 'teachers' }]}
          value={audience}
          onChange={setAudience}
        />
        <Button title={t('Post notice')} icon="send" onPress={post} />
      </Card>

      <SectionTitle title={`${t('All notices')} (${data.notices.length})`} />
      <NoticeList
        notices={data.notices}
        onDelete={(id) => confirmAction(t('Delete notice'), t('Remove this notice?'), () => deleteNotice(id))}
      />
    </Screen>
  );
}
