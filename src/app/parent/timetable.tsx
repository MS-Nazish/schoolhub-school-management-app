import { ChildSwitcher, useChild } from '@/components/ChildContext';
import { WeekTimetable } from '@/components/Timetable';
import { EmptyState, Screen } from '@/components/ui';
import { t } from '@/lib/i18n';

export default function ParentTimetable() {
  const { child } = useChild();
  if (!child) return <Screen><EmptyState text={t('No children linked to your account')} /></Screen>;
  return (
    <Screen>
      <ChildSwitcher />
      <WeekTimetable filter={(e) => e.classId === child.classId} mode="teacher" />
    </Screen>
  );
}
