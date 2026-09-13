import { useAuth } from '@/features/auth/auth-context';

export function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">Signed in as {user?.email}.</p>
    </div>
  );
}
