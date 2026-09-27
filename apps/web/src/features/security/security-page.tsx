import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { authApi } from '@/features/auth/auth-api';
import { vaultApi } from '@/features/vault/vault-api';
import { tokenStore } from '@/lib/token';

import { ChangeMasterPasswordDialog } from './change-master-password-dialog';
import { RecoveryCodesDialog } from './recovery-codes-dialog';

const STRENGTH_PCT: Record<string, number> = { VERY_WEAK: 20, WEAK: 40, FAIR: 60, STRONG: 80, VERY_STRONG: 100 };
const STRENGTH_LABEL: Record<string, string> = {
  VERY_WEAK: 'Very weak',
  WEAK: 'Weak',
  FAIR: 'Fair',
  STRONG: 'Strong',
  VERY_STRONG: 'Very strong',
};

function lastChangedLabel(updatedAt: string | null): string {
  if (!updatedAt) return 'never changed';
  const days = (Date.now() - new Date(updatedAt).getTime()) / 86_400_000;
  if (days < 1) return 'changed today';
  if (days < 60) return `changed ${Math.round(days)} day(s) ago`;
  return `changed ${Math.round(days / 30)} month(s) ago`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.round(diffHour / 24)}d ago`;
}

export function SecurityPage() {
  const queryClient = useQueryClient();
  const { data: sessions = [] } = useQuery({ queryKey: ['auth', 'sessions'], queryFn: authApi.listSessions });
  const { data: vaultStatus } = useQuery({ queryKey: ['vault', 'status'], queryFn: vaultApi.getStatus });

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  const currentDeviceId = tokenStore.getDeviceSessionId();
  const otherDevices = sessions.filter((s) => s.id !== currentDeviceId);

  async function revoke(sessionId: string) {
    await authApi.revokeSession(sessionId);
    queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
  }

  async function signOutAllOthers() {
    const ok = await confirm({ title: 'Sign out all other sessions?', confirmLabel: 'Sign out' });
    if (!ok) return;
    for (const device of otherDevices) {
      await authApi.revokeSession(device.id);
    }
    queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Security</h1>

      <section className="mt-6 rounded-lg border bg-card p-5">
        <SectionHeading>Master password</SectionHeading>
        {vaultStatus?.masterPasswordStrength && (
          <>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${STRENGTH_PCT[vaultStatus.masterPasswordStrength]}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {STRENGTH_LABEL[vaultStatus.masterPasswordStrength]} · {lastChangedLabel(vaultStatus.masterPasswordUpdatedAt)}
            </p>
          </>
        )}
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setChangePasswordOpen(true)}>Change master password</Button>
          <Button size="sm" variant="outline" onClick={() => setRecoveryOpen(true)}>Recovery codes</Button>
        </div>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between">
          <SectionHeading>Active sessions</SectionHeading>
          {otherDevices.length > 0 && (
            <button className="text-xs text-destructive hover:underline" onClick={() => void signOutAllOthers()}>
              Sign out all other sessions
            </button>
          )}
        </div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted">
              <div>
                <div className="text-sm">
                  {s.deviceName} {s.id === currentDeviceId && <span className="text-xs text-primary">(this device)</span>}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {s.deviceType} · active {relativeTime(s.lastActiveAt)}
                </div>
              </div>
              {s.id !== currentDeviceId && (
                <button className="text-xs text-destructive hover:underline" onClick={() => void revoke(s.id)}>
                  Sign out
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <ChangeMasterPasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <RecoveryCodesDialog open={recoveryOpen} onOpenChange={setRecoveryOpen} />
      {dialog}
    </div>
  );
}
