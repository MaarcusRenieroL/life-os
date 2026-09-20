import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/error';

import { vaultApi } from './vault-api';
import { useVaultState } from './vault-state';

export function VaultResetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { setUnlocked } = useVaultState();

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    code.trim().length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await vaultApi.resetWithRecoveryCode(code.trim(), newPassword);
      // The reset itself already succeeded even if this follow-up unlock call fails -
      // close the dialog regardless.
      try {
        await vaultApi.verify({ masterPassword: newPassword });
        setUnlocked(true);
        navigate('/vault/entries');
      } catch {
        // ignore - reset succeeded, user can unlock manually
      }
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to reset the vault with that recovery code.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset with a recovery code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Recovery code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <Label>New master password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="mt-1 text-xs text-destructive">Master password must be at least 8 characters.</p>
            )}
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit || busy}>
            {busy ? 'Resetting…' : 'Reset vault'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
