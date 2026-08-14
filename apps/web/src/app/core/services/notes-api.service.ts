import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  CreateNoteRequest,
  GlobalAttachment,
  Note,
  NoteListFilters,
  NoteModuleType,
  NoteSummary,
  NoteVersion,
  PageResponse,
  UpdateNoteRequest,
} from '../models/notes.model';

@Injectable({ providedIn: 'root' })
export class NotesApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/v1/notes';

  list(filters: NoteListFilters): Observable<PageResponse<NoteSummary>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http
      .get<ApiResponse<PageResponse<NoteSummary>>>(this.baseUrl, { params })
      .pipe(map((response) => response.data));
  }

  recent(limit = 10): Observable<NoteSummary[]> {
    return this.http
      .get<ApiResponse<NoteSummary[]>>(`${this.baseUrl}/recent`, { params: { limit } })
      .pipe(map((response) => response.data));
  }

  favorites(): Observable<NoteSummary[]> {
    return this.http
      .get<ApiResponse<NoteSummary[]>>(`${this.baseUrl}/favorites`)
      .pipe(map((response) => response.data));
  }

  pinned(): Observable<NoteSummary[]> {
    return this.http
      .get<ApiResponse<NoteSummary[]>>(`${this.baseUrl}/pinned`)
      .pipe(map((response) => response.data));
  }

  byModule(moduleType: NoteModuleType, moduleId: string): Observable<NoteSummary[]> {
    return this.http
      .get<ApiResponse<NoteSummary[]>>(`${this.baseUrl}/by-module/${moduleType}/${moduleId}`)
      .pipe(map((response) => response.data));
  }

  get(id: string): Observable<Note> {
    return this.http.get<ApiResponse<Note>>(`${this.baseUrl}/${id}`).pipe(map((response) => response.data));
  }

  create(request: CreateNoteRequest): Observable<Note> {
    return this.http.post<ApiResponse<Note>>(this.baseUrl, request).pipe(map((response) => response.data));
  }

  update(id: string, request: UpdateNoteRequest): Observable<Note> {
    return this.http
      .put<ApiResponse<Note>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((response) => response.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }

  restore(id: string): Observable<Note> {
    return this.http
      .post<ApiResponse<Note>>(`${this.baseUrl}/${id}/restore`, {})
      .pipe(map((response) => response.data));
  }

  duplicate(id: string, newTitle?: string): Observable<Note> {
    return this.http
      .post<ApiResponse<Note>>(`${this.baseUrl}/${id}/duplicate`, { newTitle })
      .pipe(map((response) => response.data));
  }

  getVersions(id: string): Observable<NoteVersion[]> {
    return this.http
      .get<ApiResponse<NoteVersion[]>>(`${this.baseUrl}/${id}/versions`)
      .pipe(map((response) => response.data));
  }

  restoreVersion(id: string, versionNumber: number): Observable<Note> {
    return this.http
      .post<ApiResponse<Note>>(`${this.baseUrl}/${id}/versions/${versionNumber}/restore`, {})
      .pipe(map((response) => response.data));
  }

  addLink(id: string, targetNoteId: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/${id}/links`, { targetNoteId })
      .pipe(map(() => undefined));
  }

  removeLink(sourceId: string, targetId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${sourceId}/links/${targetId}`)
      .pipe(map(() => undefined));
  }

  addTag(noteId: string, tagId: string): Observable<Note> {
    return this.http
      .post<ApiResponse<Note>>(`${this.baseUrl}/${noteId}/tags`, { tagId })
      .pipe(map((response) => response.data));
  }

  removeTag(noteId: string, tagId: string): Observable<Note> {
    return this.http
      .delete<ApiResponse<Note>>(`${this.baseUrl}/${noteId}/tags/${tagId}`)
      .pipe(map((response) => response.data));
  }

  assignFolder(noteId: string, folderId: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/${noteId}/folders`, { folderId })
      .pipe(map(() => undefined));
  }

  removeFolder(noteId: string, folderId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${noteId}/folders/${folderId}`)
      .pipe(map(() => undefined));
  }

  addModuleLink(noteId: string, moduleType: NoteModuleType, moduleId: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/${noteId}/module-links`, { moduleType, moduleId })
      .pipe(map(() => undefined));
  }

  removeModuleLink(noteId: string, linkId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${noteId}/module-links/${linkId}`)
      .pipe(map(() => undefined));
  }

  uploadAttachment(noteId: string, file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/${noteId}/attachments`, formData)
      .pipe(map(() => undefined));
  }

  downloadAttachmentUrl(noteId: string, attachmentId: string): string {
    return `${this.baseUrl}/${noteId}/attachments/${attachmentId}/download`;
  }

  deleteAttachment(noteId: string, attachmentId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${noteId}/attachments/${attachmentId}`)
      .pipe(map(() => undefined));
  }

  allAttachments(): Observable<GlobalAttachment[]> {
    return this.http
      .get<ApiResponse<GlobalAttachment[]>>(`${this.baseUrl}/attachments`)
      .pipe(map((response) => response.data));
  }

  exportUrl(id: string, format: 'markdown' | 'html' | 'pdf'): string {
    return `${this.baseUrl}/${id}/export?format=${format}`;
  }
}
