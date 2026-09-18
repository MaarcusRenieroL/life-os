import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

import { Button } from '@/components/ui/button';

/**
 * Top-level errorElement. Catches anything React Router's default error page
 * otherwise would - a thrown render/loader error, or a request that doesn't
 * match any route at all (so never reaches AppShell/NotFoundPage). Kept
 * self-contained (no sidebar, no query client assumptions) since whatever
 * broke may have broken above this point too.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : null;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-4 text-center">
      <p className="font-mono text-xs text-primary">$ status {status ?? 500}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {status === 404 ? 'Page not found' : 'Something went wrong'}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {status === 404
          ? "That path doesn't exist."
          : 'An unexpected error stopped this page from loading. Try again, or head back home.'}
      </p>
      <Button asChild className="mt-6">
        <Link to="/home">Back to Home</Link>
      </Button>
    </div>
  );
}
