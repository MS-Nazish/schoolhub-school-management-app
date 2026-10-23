import { ChildSwitcher, useChild } from '@/components/ChildContext';
import { HomeworkCard } from '@/components/HomeworkCard';
import { EmptyState, Screen, SectionTitle } from '@/components/ui';
import { useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { today } from '@/lib/utils';

export default function ParentHomework() {
  const { data } = useStore();
  const { child } = useChild();
  if (!child) return <Screen><EmptyState text={t('No children linked to your account')} /></Screen>;

  const all = data.homework.filter((h) => h.classId === child.classId);
  const upcoming = all.filter((h) => h.dueDate >= today()).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const past = all.filter((h) => h.dueDate < today()).sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  return (
    <Screen>
      <ChildSwitcher />
      <SectionTitle title={`${t('Upcoming')} (${upcoming.length})`} />
      {upcoming.length ? upcoming.map((h) => <HomeworkCard key={h.id} hw={h} />) : <EmptyState icon="happy-outline" text={t('No pending homework 🎉')} />}
      {past.length > 0 && (
        <>
          <SectionTitle title={t('Previous')} />
          {past.map((h) => <HomeworkCard key={h.id} hw={h} />)}
        </>
      )}
    </Screen>
  );
}
