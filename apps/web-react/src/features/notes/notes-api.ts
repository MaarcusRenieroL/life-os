import { api, unwrap } from '@/lib/api-client';

import type {
  Attachment,
  CreateNoteRequest,
  GlobalAttachment,
  Note,
  NoteListFilters,
  NoteModuleType,
  NoteSummary,
  NoteVersion,
  PageResponse,
  TrashedNote,
  UpdateNoteRequest,
} from './types';

const baseUrl = '/v1/notes';

export const notesApi = {
  list(filters: NoteListFilters): Promise<PageResponse<NoteSummary>> {
    return unwrap(api.get(baseUrl, { params: filters }));
  },

  recent(limit = 10): Promise<NoteSummary[]> {
    return unwrap(api.get(`${baseUrl}/recent`, { params: { limit } }));
  },

  favorites(): Promise<NoteSummary[]> {
    return unwrap(api.get(`${baseUrl}/favorites`));
  },

  pinned(): Promise<NoteSummary[]> {
    return unwrap(api.get(`${baseUrl}/pinned`));
  },

  byModule(moduleType: NoteModuleType, moduleId: string): Promise<NoteSummary[]> {
    return unwrap(api.get(`${baseUrl}/by-module/${moduleType}/${moduleId}`));
  },

  get(id: string): Promise<Note> {
    return unwrap(api.get(`${baseUrl}/${id}`));
  },

  create(request: CreateNoteRequest): Promise<Note> {
    return unwrap(api.post(baseUrl, request));
  },

  update(id: string, request: UpdateNoteRequest): Promise<Note> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },

  async delete(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },

  restore(id: string): Promise<Note> {
    return unwrap(api.post(`${baseUrl}/${id}/restore`, {}));
  },

  trash(): Promise<TrashedNote[]> {
    return unwrap(api.get(`${baseUrl}/trash`));
  },

  async permanentlyDelete(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}/permanent`);
  },

  duplicate(id: string, newTitle?: string): Promise<Note> {
    return unwrap(api.post(`${baseUrl}/${id}/duplicate`, { newTitle }));
  },

  getVersions(id: string): Promise<NoteVersion[]> {
    return unwrap(api.get(`${baseUrl}/${id}/versions`));
  },

  restoreVersion(id: string, versionNumber: number): Promise<Note> {
    return unwrap(api.post(`${baseUrl}/${id}/versions/${versionNumber}/restore`, {}));
  },

  async addLink(id: string, targetNoteId: string): Promise<void> {
    await api.post(`${baseUrl}/${id}/links`, { targetNoteId });
  },

  async removeLink(sourceId: string, targetId: string): Promise<void> {
    await api.delete(`${baseUrl}/${sourceId}/links/${targetId}`);
  },

  addTag(noteId: string, tagId: string): Promise<Note> {
    return unwrap(api.post(`${baseUrl}/${noteId}/tags`, { tagId }));
  },

  removeTag(noteId: string, tagId: string): Promise<Note> {
    return unwrap(api.delete(`${baseUrl}/${noteId}/tags/${tagId}`));
  },

  async assignFolder(noteId: string, folderId: string): Promise<void> {
    await api.post(`${baseUrl}/${noteId}/folders`, { folderId });
  },

  async removeFolder(noteId: string, folderId: string): Promise<void> {
    await api.delete(`${baseUrl}/${noteId}/folders/${folderId}`);
  },

  async addModuleLink(noteId: string, moduleType: NoteModuleType, moduleId: string): Promise<void> {
    await api.post(`${baseUrl}/${noteId}/module-links`, { moduleType, moduleId });
  },

  async removeModuleLink(noteId: string, linkId: string): Promise<void> {
    await api.delete(`${baseUrl}/${noteId}/module-links/${linkId}`);
  },

  async uploadAttachment(noteId: string, file: File): Promise<Attachment> {
    const form = new FormData();
    form.append('file', file);
    return unwrap(api.post(`${baseUrl}/${noteId}/attachments`, form));
  },

  downloadAttachmentUrl(noteId: string, attachmentId: string): string {
    return `${baseUrl}/${noteId}/attachments/${attachmentId}/download`;
  },

  async deleteAttachment(noteId: string, attachmentId: string): Promise<void> {
    await api.delete(`${baseUrl}/${noteId}/attachments/${attachmentId}`);
  },

  allAttachments(): Promise<GlobalAttachment[]> {
    return unwrap(api.get(`${baseUrl}/attachments`));
  },

  exportUrl(id: string, format: 'markdown' | 'html' | 'pdf'): string {
    return `${baseUrl}/${id}/export?format=${format}`;
  },
};
