import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { authApi } from '@/features/auth/auth-api';
import { vaultApi } from '@/features/vault/vault-api';
import { getErrorMessage } from '@/lib/error';
import { tokenStore } from '@/lib/token';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Deletes vault data first (still authenticated at that point), then the account itself
 * in auth-service (which removes the row backing the current JWT), then clears local
 * tokens and redirects. If the vault call fails, the account is left fully intact. If
 * vault succeeds but the auth call fails, vault data is already gone - the error message
 * says so explicitly rather than pretending nothing happened.
 */
export function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await vaultApi.deleteAccount();
    } catch (err) {
      setDeleting(false);
      setError(getErrorMessage(err, 'Unable to delete account.'));
      return;
    }

    try {
      await authApi.deleteAccount();
      setDeleting(false);
      tokenStore.clear();
      onOpenChange(false);
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleting(false);
      setError(
        getErrorMessage(
          err,
          'Vault data was deleted, but the account itself could not be removed. Try again.',
        ),
      );
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Delete account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your entire vault (entries, cards, recovery codes) and your
            account. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void confirmDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {deleting ? 'Deleting…' : 'Delete account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
