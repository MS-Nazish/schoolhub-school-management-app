import { RoleTabs } from '@/components/shared';
import { unreadMessages, useStore } from '@/data/store';

export default function TeacherTabs() {
  const { data, user } = useStore();
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Home', icon: 'home' },
        { name: 'attendance', title: 'Attendance', icon: 'checkbox' },
        { name: 'homework', title: 'Homework', icon: 'book' },
        { name: 'results', title: 'Results', icon: 'ribbon' },
        { name: 'messages', title: 'Messages', icon: 'chatbubbles', badge: user ? unreadMessages(data, user.id) : 0 },
      ]}
    />
  );
}
