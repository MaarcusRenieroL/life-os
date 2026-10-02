import { useState } from 'react';

import { Screen, Seg } from '@/kit';
import { NotesTab } from '@/modules/notes-main';
import { AttachmentsTab, GraphTab, JournalTab, NoteSettingsTab, SearchTab, TemplatesTab } from '@/modules/notes-extra';

const TABS = [{ id: 'notes', label: 'All notes' }, { id: 'journal', label: 'Journal' }, { id: 'search', label: 'Search' }, { id: 'templates', label: 'Templates' }, { id: 'graph', label: 'Graph' }, { id: 'attachments', label: 'Attachments' }, { id: 'settings', label: 'Settings' }] as const;
type TabId = (typeof TABS)[number]['id'];

export default function Notes() {
  const [tab, setTab] = useState<TabId>('notes');
  const [openId, setOpenId] = useState<string | null>(null);
  const open = (id: string) => { setOpenId(id); setTab('notes'); };
  return (
    <Screen title="Notes">
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'notes' ? <NotesTab key={openId ?? 'none'} initialOpenId={openId} /> : tab === 'journal' ? <JournalTab /> : tab === 'search' ? <SearchTab onOpen={open} /> : tab === 'templates' ? <TemplatesTab onOpen={open} /> : tab === 'graph' ? <GraphTab onOpen={open} /> : tab === 'attachments' ? <AttachmentsTab onOpen={open} /> : <NoteSettingsTab />}
    </Screen>
  );
}
