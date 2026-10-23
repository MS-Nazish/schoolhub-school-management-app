import { WeekTimetable } from '@/components/Timetable';
import { Screen } from '@/components/ui';
import { useStore } from '@/data/store';

export default function TeacherTimetable() {
  const { user } = useStore();
  return (
    <Screen>
      <WeekTimetable filter={(e) => e.teacherId === user?.id} mode="class" />
    </Screen>
  );
}
