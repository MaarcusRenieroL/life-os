import { parseSetupLink } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { useSession } from '../lib/session';
import { isMock } from '../lib/runtime';

export function LoginScreen() {
  const { signIn, settings } = useSession();
  const [email, setEmail] = useState(isMock ? 'player@life.os' : '');
  const [password, setPassword] = useState(isMock ? 'preview' : '');
  const [server, setServer] = useState(settings.baseUrl);
  const [cfId, setCfId] = useState(settings.cfClientId);
  const [cfSecret, setCfSecret] = useState(settings.cfClientSecret);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password, { ...settings, baseUrl: server.trim().replace(/\/+$/, ''), cfClientId: cfId.trim(), cfClientSecret: cfSecret.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="title-screen">
      <form className="panel login" onSubmit={submit}>
        <div className="brand big">Life_OS</div>
        <p className="muted">Press start to continue your run.</p>
        <label>
          <span className="label">Paste a setup link (optional)</span>
          <input
            placeholder="lifeos://setup?server=…"
            autoComplete="off"
            onChange={(e) => {
              const parsed = parseSetupLink(e.target.value);
              if (!parsed) return;
              setServer(parsed.baseUrl);
              setCfId(parsed.cfClientId);
              setCfSecret(parsed.cfClientSecret);
              e.target.value = '';
            }}
          />
        </label>
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
        <label>
          <span className="label">Access client id (only for https://life-os.maarcus.dev)</span>
          <input value={cfId} onChange={(e) => setCfId(e.target.value)} placeholder="optional" autoComplete="off" />
        </label>
        <label>
          <span className="label">Access client secret</span>
          <input value={cfSecret} onChange={(e) => setCfSecret(e.target.value)} type="password" placeholder="optional" autoComplete="off" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Connecting…' : 'Press start'}</button>
      </form>
    </div>
  );
}
