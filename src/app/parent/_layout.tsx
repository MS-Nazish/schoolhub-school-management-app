import { ChildProvider } from '@/components/ChildContext';
import { RoleStack } from '@/components/shared';

export default function ParentLayout() {
  return (
    <ChildProvider>
      <RoleStack
        role="parent"
        pages={[
          { name: 'homework', title: 'Homework' },
          { name: 'timetable', title: 'Timetable' },
        ]}
      />
    </ChildProvider>
  );
}
