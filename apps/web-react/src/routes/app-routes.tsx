import { Navigate, createBrowserRouter } from 'react-router-dom';

import { LoginPage } from '@/features/auth/login-page';
import { ProtectedRoute } from '@/features/auth/protected-route';
import { HomePage } from '@/features/home/home-page';
import { AddJobPage } from '@/features/job-tracker/add-job-page';
import { JobDetailPage } from '@/features/job-tracker/job-detail-page';
import { JobTrackerLayout } from '@/features/job-tracker/job-tracker-layout';
import { JobsListPage } from '@/features/job-tracker/jobs-list-page';
import { ResumePage } from '@/features/job-tracker/resume-page';
import { NoteEditorPage } from '@/features/notes/note-editor-page';
import { NoteSearchPage } from '@/features/notes/note-search-page';
import { NoteTemplatesPage } from '@/features/notes/note-templates-page';
import { NotesAttachmentsPage } from '@/features/notes/notes-attachments-page';
import { NotesGraphPage } from '@/features/notes/notes-graph-page';
import { NotesLayout } from '@/features/notes/notes-layout';
import { NotesListPage } from '@/features/notes/notes-list-page';
import { NotesSettingsPage } from '@/features/notes/notes-settings-page';
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
          {
            path: 'notes',
            element: <NotesLayout />,
            children: [
              { index: true, element: <NotesListPage /> },
              { path: 'search', element: <NoteSearchPage /> },
              { path: 'templates', element: <NoteTemplatesPage /> },
              { path: 'graph', element: <NotesGraphPage /> },
              { path: 'attachments', element: <NotesAttachmentsPage /> },
              { path: 'settings', element: <NotesSettingsPage /> },
            ],
          },
          // Must stay after the static notes/* subpaths above so it doesn't shadow them.
          { path: 'notes/:id', element: <NoteEditorPage /> },
        ],
      },
    ],
  },
]);
