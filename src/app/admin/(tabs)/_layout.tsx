import { RoleTabs } from '@/components/shared';

export default function AdminTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Dashboard', icon: 'grid' },
        { name: 'students', title: 'Students', icon: 'people' },
        { name: 'teachers', title: 'Teachers', icon: 'school' },
        { name: 'fees', title: 'Fees', icon: 'wallet' },
        { name: 'salaries', title: 'Salaries', icon: 'cash' },
      ]}
    />
  );
}
