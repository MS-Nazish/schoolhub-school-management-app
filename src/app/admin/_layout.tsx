import { RoleStack } from '@/components/shared';

export default function AdminLayout() {
  return (
    <RoleStack
      role="admin"
      pages={[
        { name: 'timetable', title: 'Timetable' },
        { name: 'notices', title: 'Notices' },
        { name: 'teacher/[id]', title: 'Edit teacher' },
      ]}
    />
  );
}
