import { Outlet } from 'react-router-dom';

import { TabNav } from '@/components/tab-nav';

const TABS = [
  { label: 'All Notes', to: '/notes', end: true },
  { label: 'Journal', to: '/notes/journal', end: false },
  { label: 'Search', to: '/notes/search', end: false },
  { label: 'Templates', to: '/notes/templates', end: false },
  { label: 'Graph', to: '/notes/graph', end: false },
  { label: 'Attachments', to: '/notes/attachments', end: false },
  { label: 'Settings', to: '/notes/settings', end: false },
];

export function NotesLayout() {
  return (
    <div>
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  );
}
