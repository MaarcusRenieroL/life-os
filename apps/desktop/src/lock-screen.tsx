import { useEffect } from 'react';

import { useLock } from './lib/lock';
import { useSession } from './lib/session';

/** Shown instead of the app while the Touch ID lock is on; asks as soon as it appears. */
export function LockScreen() {
  const { unlock } = useLock();
  const { signOut } = useSession();

  useEffect(() => {
    void unlock();
  }, [unlock]);

  return (
    <div className="title-screen">
      <div className="panel login">
        <div className="brand big">Life_OS</div>
        <p className="muted">Locked. Use Touch ID or your Mac password to continue.</p>
        <button className="primary" onClick={() => void unlock()}>Unlock</button>
        <button className="ghost" onClick={() => void signOut()}>Sign out instead</button>
      </div>
    </div>
  );
}
