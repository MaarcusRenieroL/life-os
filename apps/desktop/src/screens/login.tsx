import { useState, type FormEvent } from 'react';

import { useSession } from '../lib/session';
import { isMock } from '../lib/runtime';

export function LoginScreen() {
  const { signIn, settings, updateSettings } = useSession();
  const [email, setEmail] = useState(isMock ? 'player@life.os' : '');
  const [password, setPassword] = useState(isMock ? 'preview' : '');
  const [server, setServer] = useState(settings.baseUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (server !== settings.baseUrl) await updateSettings({ ...settings, baseUrl: server.trim() });
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="title-screen">
      <form className="panel login" onSubmit={submit}>
        <div className="brand big">LIFE<span>OS</span></div>
        <p className="muted">Press start to continue your run.</p>
        <label>
          <span className="label">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoFocus required autoComplete="username" />
        </label>
        <label>
          <span className="label">Password</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password" />
        </label>
        <label>
          <span className="label">Server</span>
          <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="http://localhost" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Connecting…' : 'Press start'}</button>
      </form>
    </div>
  );
}
