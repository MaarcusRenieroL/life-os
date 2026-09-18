import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

/**
 * Catches any unmatched path inside the authenticated app shell (a stale
 * bookmark, a typo'd URL, a deep link to a tab that's really just client
 * state). Renders inside <AppShell>, so the sidebar/breadcrumb stay put -
 * this replaces only the main content area, not React Router's default
 * "Unexpected Application Error!" dump.
 */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <p className="font-mono text-xs text-primary">$ cd {window.location.pathname}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">404 — page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Nothing lives at this path. It may have moved, or the link was never right to begin with.
      </p>
      <Button asChild className="mt-6">
        <Link to="/home">Back to Home</Link>
      </Button>
    </div>
  );
}
