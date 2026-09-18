import { Navigate, Outlet } from 'react-router-dom';

import { tokenStore } from '@/lib/token';

import { useAuth } from './auth-context';

/**
 * Gate for everything under the app shell. Checks the token synchronously
 * (fast path, no flash of the login screen) and defers to the auth context's
 * "am I actually still logged in" check only while it's in flight.
 */
export function ProtectedRoute() {
  const { loading } = useAuth();

  if (!tokenStore.getAccessToken()) {
    return <Navigate to="/login" replace />;
  }
  if (loading) {
    return null;
  }
  return <Outlet />;
}
