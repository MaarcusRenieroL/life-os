import { Outlet } from 'react-router-dom';

import { TabNav } from '@/components/tab-nav';

const TABS = [
  { label: 'Today', to: '/workouts', end: true },
  { label: 'Routines', to: '/workouts/routines', end: false },
  { label: 'Exercises', to: '/workouts/exercises', end: false },
  { label: 'History', to: '/workouts/history', end: false },
  { label: 'Records', to: '/workouts/records', end: false },
  { label: 'Body', to: '/workouts/body', end: false },
  { label: 'Analytics', to: '/workouts/analytics', end: false },
];

export function WorkoutsLayout() {
  return (
    <div>
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  );
}
