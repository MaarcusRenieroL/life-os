import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  Accomplishment,
  CoverLetter,
  CoverLetterTemplate,
  CoverLetterVersion,
  ResumeKeywordMatch,
  ResumeTailoring,
  ResumeTemplate,
  ResumeVariant,
} from '../models/resume-builder.model';

@Injectable({ providedIn: 'root' })
export class ResumeBuilderApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/v1/resumes/variants';

  // --- variants ---------------------------------------------------------

  listVariants(): Observable<ResumeVariant[]> {
    return this.http.get<ApiResponse<ResumeVariant[]>>(this.base).pipe(map((r) => r.data));
  }

  getVariant(id: string): Observable<ResumeVariant> {
    return this.http.get<ApiResponse<ResumeVariant>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  createVariant(payload: { name: string; description?: string; baseVariantId?: string }): Observable<ResumeVariant> {
    return this.http.post<ApiResponse<ResumeVariant>>(this.base, payload).pipe(map((r) => r.data));
  }

  updateVariant(id: string, payload: Partial<ResumeVariant>): Observable<ResumeVariant> {
    return this.http.put<ApiResponse<ResumeVariant>>(`${this.base}/${id}`, payload).pipe(map((r) => r.data));
  }

  deleteVariant(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`).pipe(map(() => undefined));
  }

  cloneVariant(id: string, newName: string): Observable<ResumeVariant> {
    return this.http.post<ApiResponse<ResumeVariant>>(`${this.base}/${id}/clone`, { newName }).pipe(map((r) => r.data));
  }

  duplicateForJob(id: string, jobListingId: string): Observable<ResumeVariant> {
    return this.http
      .post<ApiResponse<ResumeVariant>>(`${this.base}/${id}/duplicate-for-job`, { jobListingId })
      .pipe(map((r) => r.data));
  }

  // --- sections -----------------------------------------------------------

  createSection(
    variantId: string,
    payload: { sectionType: string; title?: string; content: unknown[] },
  ): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/${variantId}/sections`, payload)
      .pipe(map((r) => r.data));
  }

  updateSection(variantId: string, sectionId: string, payload: { content?: unknown[]; title?: string }): Observable<unknown> {
    return this.http
      .put<ApiResponse<unknown>>(`${this.base}/${variantId}/sections/${sectionId}`, payload)
      .pipe(map((r) => r.data));
  }

  deleteSection(variantId: string, sectionId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${variantId}/sections/${sectionId}`)
      .pipe(map(() => undefined));
  }

  // --- tailoring / keywords / export ---------------------------------------

  tailorForJob(variantId: string, jobListingId: string, customInstructions?: string, applicationId?: string): Observable<ResumeTailoring> {
    return this.http
      .post<ApiResponse<ResumeTailoring>>(`${this.base}/${variantId}/tailor-for-job/${jobListingId}`, {
        customInstructions,
        applicationId,
      })
      .pipe(map((r) => r.data));
  }

  analyzeKeywords(variantId: string, jobListingId: string): Observable<ResumeKeywordMatch> {
    return this.http
      .post<ApiResponse<ResumeKeywordMatch>>(`${this.base}/${variantId}/analyze-keywords`, { jobListingId })
      .pipe(map((r) => r.data));
  }

  keywordMatches(variantId: string): Observable<ResumeKeywordMatch[]> {
    return this.http
      .get<ApiResponse<ResumeKeywordMatch[]>>(`${this.base}/${variantId}/keyword-matches`)
      .pipe(map((r) => r.data));
  }

  resumeTemplates(): Observable<ResumeTemplate[]> {
    return this.http.get<ApiResponse<ResumeTemplate[]>>('/v1/resume-templates').pipe(map((r) => r.data));
  }

  // --- accomplishments ------------------------------------------------------

  accomplishments(category?: string, search?: string): Observable<Accomplishment[]> {
    const params: Record<string, string> = {};
    if (category) params['category'] = category;
    if (search) params['search'] = search;
    return this.http
      .get<ApiResponse<Accomplishment[]>>('/v1/accomplishments', { params })
      .pipe(map((r) => r.data));
  }

  createAccomplishment(payload: { category?: string; bulletText: string; keywords?: string[] }): Observable<Accomplishment> {
    return this.http.post<ApiResponse<Accomplishment>>('/v1/accomplishments', payload).pipe(map((r) => r.data));
  }

  deleteAccomplishment(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`/v1/accomplishments/${id}`).pipe(map(() => undefined));
  }

  addAccomplishmentToSection(accomplishmentId: string, resumeVariantId: string, sectionId: string): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`/v1/accomplishments/${accomplishmentId}/add-to-section`, {
        resumeVariantId,
        sectionId,
      })
      .pipe(map((r) => r.data));
  }

  // --- cover letters --------------------------------------------------------

  generateCoverLetter(
    applicationId: string,
    payload: { tone?: string; style?: string; templateId?: string; resumeVariantId?: string; customInstructions?: string },
  ): Observable<CoverLetter> {
    return this.http
      .post<ApiResponse<CoverLetter>>(`/v1/applications/${applicationId}/cover-letter/generate`, payload)
      .pipe(map((r) => r.data));
  }

  getCoverLetterForApplication(applicationId: string): Observable<CoverLetter> {
    return this.http
      .get<ApiResponse<CoverLetter>>(`/v1/applications/${applicationId}/cover-letter`)
      .pipe(map((r) => r.data));
  }

  updateCoverLetter(id: string, generatedContent: string): Observable<CoverLetter> {
    return this.http
      .put<ApiResponse<CoverLetter>>(`/v1/cover-letters/${id}`, { generatedContent })
      .pipe(map((r) => r.data));
  }

  revertCoverLetter(id: string): Observable<CoverLetter> {
    return this.http
      .post<ApiResponse<CoverLetter>>(`/v1/cover-letters/${id}/revert-to-generated`, {})
      .pipe(map((r) => r.data));
  }

  coverLetterVersions(id: string): Observable<CoverLetterVersion[]> {
    return this.http
      .get<ApiResponse<CoverLetterVersion[]>>(`/v1/cover-letters/${id}/versions`)
      .pipe(map((r) => r.data));
  }

  coverLetterTemplates(): Observable<CoverLetterTemplate[]> {
    return this.http.get<ApiResponse<CoverLetterTemplate[]>>('/v1/cover-letter-templates').pipe(map((r) => r.data));
  }
}
