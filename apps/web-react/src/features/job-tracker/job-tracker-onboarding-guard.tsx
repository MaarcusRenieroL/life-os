import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router-dom';

import { careerProfileApi } from './career-profile-api';

/** Hard-gates the whole job-tracker module behind having a career profile - there's no per-job
 * resume to tailor from otherwise. Every guarded navigation re-checks the server rather than
 * trusting a cached flag, same pattern as the vault unlock guard. */
export function JobTrackerOnboardingGuard() {
  const { data, isLoading } = useQuery({
    queryKey: ['career-profile'],
    queryFn: careerProfileApi.get,
  });

  if (isLoading) return null;
  if (!data?.onboarded) return <Navigate to="/jobs/onboarding" replace />;
  return <Outlet />;
}
