import { NoticeList } from '@/components/shared';
import { Screen } from '@/components/ui';
import { noticesFor, useStore } from '@/data/store';

export default function TeacherNotices() {
  const { data } = useStore();
  return (
    <Screen>
      <NoticeList notices={noticesFor(data, 'teacher')} />
    </Screen>
  );
}
