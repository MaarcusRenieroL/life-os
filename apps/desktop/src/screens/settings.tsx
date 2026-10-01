import { useState, type FormEvent } from 'react';

import { useLock } from '../lib/lock';
import { useSession } from '../lib/session';
import { Panel } from '../ui';

export function SettingsScreen() {
  const { settings, updateSettings, signOut } = useSession();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const lock = useLock();
  const [lockError, setLockError] = useState<string | null>(null);

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
          <p className="muted">Use http://localhost on the Mac that runs Life OS, or https://life-os-api.maarcus.dev from anywhere. The website address (life-os.maarcus.dev) is behind Cloudflare Access and would need a service token below.</p>
          {field('cfClientId', 'Access client id (optional)')}
          {field('cfClientSecret', 'Access client secret (optional)', '', 'password')}
          <button className="primary">Save</button> {saved && <span className="muted">Saved.</span>}
        </form>
      </Panel>
      <Panel title="Shortcuts">
        <p className="muted"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Space</kbd> quick capture from anywhere · <kbd>⌘K</kbd> in the app · <kbd>⌘1</kbd>–<kbd>⌘9</kbd> switch the first nine screens. Closing the window keeps Life OS in the menu bar.</p>
      </Panel>
      <Panel title="Security">
        <label className="row" style={{ justifyContent: 'flex-start' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={lock.enabled} disabled={!lock.available && !lock.enabled} onChange={(e) => { setLockError(null); void lock.setEnabled(e.target.checked).then((ok) => { if (!ok) setLockError('Could not confirm Touch ID, so the setting is unchanged.'); }); }} />
          <span>Unlock with Touch ID</span>
        </label>
        <p className="muted">{lock.available ? 'Asks for Touch ID (or your Mac password) when Life OS opens and after it has been in the background for 5 minutes.' : 'Touch ID unlock needs the installed app on a Mac with a login password or Touch ID.'}</p>
        {lockError && <p className="error">{lockError}</p>}
      </Panel>
      <Panel title="Account"><button className="danger" onClick={() => void signOut()}>Sign out</button></Panel>
    </div>
  );
}
