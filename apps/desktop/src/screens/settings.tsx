import { useState, type FormEvent } from 'react';

import { useSession } from '../lib/session';
import { Panel } from '../ui';

export function SettingsScreen() {
  const { settings, updateSettings, signOut } = useSession();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    await updateSettings({ ...draft, baseUrl: draft.baseUrl.trim().replace(/\/+$/, '') });
    setSaved(true);
  }

  const field = (key: keyof typeof draft, label: string, placeholder = '', type = 'text') => (
    <label>
      <span className="label">{label}</span>
      <input type={type} value={draft[key]} placeholder={placeholder} onChange={(e) => { setDraft({ ...draft, [key]: e.target.value }); setSaved(false); }} />
    </label>
  );

  return (
    <div className="stack">
      <Panel title="Server">
        <form className="form" onSubmit={save}>
          {field('baseUrl', 'Gateway address', 'http://localhost')}
          <p className="muted">Use http://localhost on the Mac that runs Life OS, or https://life-os.maarcus.dev from anywhere. The public address sits behind Cloudflare Access, so it needs a service token below.</p>
          {field('cfClientId', 'Access client id (optional)')}
          {field('cfClientSecret', 'Access client secret (optional)', '', 'password')}
          <button className="primary">Save</button> {saved && <span className="muted">Saved.</span>}
        </form>
      </Panel>
      <Panel title="Shortcuts">
        <p className="muted"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Space</kbd> quick capture from anywhere · <kbd>⌘K</kbd> in the app · <kbd>⌘1</kbd>–<kbd>⌘8</kbd> switch screens. Closing the window keeps Life OS in the menu bar.</p>
      </Panel>
      <Panel title="Account"><button className="danger" onClick={() => void signOut()}>Sign out</button></Panel>
    </div>
  );
}
