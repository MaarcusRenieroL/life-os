export type NoteType =
  | 'GENERAL'
  | 'MEETING'
  | 'BOOK'
  | 'LEARNING'
  | 'TECHNICAL'
  | 'SNIPPET'
  | 'RESEARCH'
  | 'CHECKLIST'
  | 'TRAVEL'
  | 'DECISION';

export type NoteModuleType = 'PROJECT' | 'GOAL' | 'TASK' | 'JOB_APPLICATION' | 'HABIT';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  usageCount: number;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentFolderId: string | null;
  noteCount: number;
  createdAt: string;
  updatedAt: string;
  children: Folder[];
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string | null;
  uploadDate: string;
}

export interface NoteLink {
  id: string;
  title: string;
  excerpt: string;
  linkedAt: string;
}

export interface NoteModuleLink {
  id: string;
  moduleType: NoteModuleType;
  moduleId: string;
  createdAt: string;
}

export interface NoteVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
  createdBy: string | null;
}

export interface NoteSummary {
  id: string;
  title: string;
  description: string | null;
  noteType: NoteType;
  tags: Tag[];
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string | null;
  description: string | null;
  noteType: NoteType;
  parentNoteId: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isFavorite: boolean;
  contentVersion: number;
  wordCount: number;
  readingTimeMinutes: number;
  tags: Tag[];
  folderIds: string[];
  attachments: Attachment[];
  outgoingLinks: NoteLink[];
  backlinks: NoteLink[];
  moduleLinks: NoteModuleLink[];
  versions: NoteVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  title: string;
  content?: string;
  noteType?: NoteType;
  folderId?: string;
  tags?: string[];
  moduleLinks?: { moduleType: NoteModuleType; moduleId: string }[];
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  description?: string;
  noteType?: NoteType;
  isPinned?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
}

export interface NoteListFilters {
  sort?: 'title' | 'created' | 'modified' | 'manual';
  order?: 'asc' | 'desc';
  folder?: string;
  tag?: string;
  noteType?: NoteType;
  archived?: boolean;
  favorite?: boolean;
  page?: number;
  size?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  tags: Tag[];
  matchedFields: string[];
  updatedAt: string;
}

export interface SearchSuggestion {
  id: string;
  label: string;
  type: string;
}

export interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount: number;
}

export interface NoteTemplate {
  id: string;
  name: string;
  content: string | null;
  category: string | null;
  preview: string;
  createdAt: string;
  updatedAt: string;
}
