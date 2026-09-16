import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { vaultApi } from './vault-api';
import { useVaultState } from './vault-state';
import { VaultResetDialog } from './vault-reset-dialog';

export function VaultUnlockPage() {
  const navigate = useNavigate();
  const { setUnlocked } = useVaultState();

  const [hasMasterPassword, setHasMasterPassword] = useState<boolean | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    vaultApi.getStatus().then((status) => {
      if (status.unlocked) {
        setUnlocked(true);
        navigate('/vault/entries', { replace: true });
        return;
      }
      setHasMasterPassword(status.hasMasterPassword);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (masterPassword.length < 8 || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!hasMasterPassword) {
        await vaultApi.setup({ masterPassword });
      }
      await vaultApi.verify({ masterPassword });
      setUnlocked(true);
      navigate('/vault/entries');
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          (hasMasterPassword ? 'Unable to unlock the vault.' : 'Unable to set up the vault.'),
      );
    } finally {
      setBusy(false);
    }
  }

  if (hasMasterPassword === null) return null;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{hasMasterPassword ? 'Unlock vault' : 'Set up your vault'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {hasMasterPassword
              ? 'Enter your master password to unlock the vault.'
              : 'Choose a master password. This encrypts every secret in your vault.'}
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="masterPassword">Master password</Label>
            <Input
              id="masterPassword"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
            />
            {masterPassword.length > 0 && masterPassword.length < 8 && (
              <p className="text-xs text-destructive">Master password must be at least 8 characters.</p>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <Button className="mt-4 w-full" onClick={() => void submit()} disabled={busy || masterPassword.length < 8}>
            {busy ? 'Please wait…' : hasMasterPassword ? 'Unlock' : 'Set up vault'}
          </Button>
          {hasMasterPassword && (
            <button
              className="mt-3 text-xs text-muted-foreground hover:underline"
              onClick={() => setResetOpen(true)}
            >
              Forgot master password?
            </button>
          )}
        </CardContent>
      </Card>
      <VaultResetDialog open={resetOpen} onOpenChange={setResetOpen} />
    </div>
  );
}
