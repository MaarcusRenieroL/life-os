import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AuditLogPage } from '@/features/audit-log/audit-log-page';
import { LoginPage } from '@/features/auth/login-page';
import { ProtectedRoute } from '@/features/auth/protected-route';
import { CardListPage } from '@/features/cards/card-list-page';
import { DataManagementPage } from '@/features/data-management/data-management-page';
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
import { SecurityPage } from '@/features/security/security-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { VaultEntryListPage } from '@/features/vault/vault-entry-list-page';
import { VaultHealthPage } from '@/features/vault/vault-health-page';
import { VaultLayout } from '@/features/vault/vault-layout';
import { VaultUnlockGuard } from '@/features/vault/vault-unlock-guard';
import { VaultUnlockPage } from '@/features/vault/vault-unlock-page';
import { VaultStateProvider } from '@/features/vault/vault-state';
import { AppShell } from '@/layout/app-shell';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: (
          <VaultStateProvider>
            <AppShell />
          </VaultStateProvider>
        ),
        children: [
          { index: true, element: <Navigate to="/home" replace /> },
          { path: 'home', element: <HomePage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'vault', element: <VaultUnlockPage /> },
          {
            element: <VaultUnlockGuard />,
            children: [
              {
                element: <VaultLayout />,
                children: [
                  { path: 'vault/entries', element: <VaultEntryListPage /> },
                  { path: 'vault/health', element: <VaultHealthPage /> },
                  { path: 'vault/cards', element: <CardListPage /> },
                  { path: 'vault/security', element: <SecurityPage /> },
                  { path: 'vault/audit-log', element: <AuditLogPage /> },
                  { path: 'vault/data', element: <DataManagementPage /> },
                ],
              },
            ],
          },
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
