import { RoleTabs } from '@/components/shared';
import { unreadMessages, useStore } from '@/data/store';

export default function ParentTabs() {
  const { data, user } = useStore();
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Home', icon: 'home' },
        { name: 'attendance', title: 'Attendance', icon: 'calendar' },
        { name: 'results', title: 'Results', icon: 'ribbon' },
        { name: 'fees', title: 'Fees', icon: 'wallet' },
        { name: 'messages', title: 'Messages', icon: 'chatbubbles', badge: user ? unreadMessages(data, user.id) : 0 },
      ]}
    />
  );
}
