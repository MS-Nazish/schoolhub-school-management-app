import { RoleStack } from '@/components/shared';

export default function TeacherLayout() {
  return (
    <RoleStack
      role="teacher"
      pages={[
        { name: 'timetable', title: 'My Timetable' },
        { name: 'salary', title: 'My Salary' },
        { name: 'notices', title: 'Notices' },
      ]}
    />
  );
}
