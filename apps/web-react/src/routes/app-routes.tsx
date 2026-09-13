import { Navigate, createBrowserRouter } from 'react-router-dom';

import { LoginPage } from '@/features/auth/login-page';
import { ProtectedRoute } from '@/features/auth/protected-route';
import { HomePage } from '@/features/home/home-page';
import { AddJobPage } from '@/features/job-tracker/add-job-page';
import { JobDetailPage } from '@/features/job-tracker/job-detail-page';
import { JobTrackerLayout } from '@/features/job-tracker/job-tracker-layout';
import { JobsListPage } from '@/features/job-tracker/jobs-list-page';
import { ResumePage } from '@/features/job-tracker/resume-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { AppShell } from '@/layout/app-shell';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/home" replace /> },
          { path: 'home', element: <HomePage /> },
          { path: 'settings', element: <SettingsPage /> },
          {
            path: 'jobs',
            element: <JobTrackerLayout />,
            children: [
              { index: true, element: <JobsListPage /> },
              { path: 'discovery', element: <AddJobPage /> },
              { path: 'resumes', element: <ResumePage /> },
            ],
          },
          { path: 'jobs/:jobId', element: <JobDetailPage /> },
        ],
      },
    ],
  },
]);
