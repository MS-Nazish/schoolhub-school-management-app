import { RoleStack } from '@/components/shared';

export default function AdminLayout() {
  return (
    <RoleStack
      role="admin"
      pages={[
        { name: 'timetable', title: 'Timetable' },
        { name: 'notices', title: 'Notices' },
        { name: 'teacher/[id]', title: 'Edit teacher' },
        { name: 'student/[id]', title: 'Edit student' },
        { name: 'fee-structure', title: 'Fee structure' },
        { name: 'attendance', title: 'Attendance register' },
      ]}
    />
  );
}
