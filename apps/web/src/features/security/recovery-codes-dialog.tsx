import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { vaultApi } from '@/features/vault/vault-api';

export function RecoveryCodesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!currentPassword || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await vaultApi.generateRecoveryCodes(currentPassword);
      setCodes(result.codes);
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          'Unable to generate recovery codes.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setCodes(null);
          setCurrentPassword('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader><DialogTitle>Recovery codes</DialogTitle></DialogHeader>
        {!codes ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Generating new codes invalidates any previous ones. Confirm your master password to continue.
            </p>
            <div>
              <Label>Master password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground">
              Save these somewhere safe — each code can be used once to reset your master password.
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
              {codes.map((code) => (
                <li key={code} className="rounded-md border bg-muted px-2 py-1">{code}</li>
              ))}
            </ul>
          </div>
        )}
        <DialogFooter>
          {!codes ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => void generate()} disabled={!currentPassword || busy}>
                {busy ? 'Generating…' : 'Generate codes'}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
