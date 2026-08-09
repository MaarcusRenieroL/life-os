import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  AnalyticsDashboardResponse,
  ConversionFunnelResponse,
  PipelineResponse,
  RateResponse,
  ReferralEffectivenessResponse,
  SkillCount,
  SourcePerformanceResponse,
  TimeToOfferResponse,
} from '../models/job-tracker.model';

@Injectable({ providedIn: 'root' })
export class JobAnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/jobs/analytics';

  getDashboard(): Observable<AnalyticsDashboardResponse> {
    return this.http
      .get<ApiResponse<AnalyticsDashboardResponse>>(`${this.baseUrl}/dashboard`)
      .pipe(map((response) => response.data));
  }

  getPipeline(): Observable<PipelineResponse> {
    return this.http.get<ApiResponse<PipelineResponse>>(`${this.baseUrl}/pipeline`).pipe(map((response) => response.data));
  }

  getResponseRate(): Observable<RateResponse> {
    return this.http
      .get<ApiResponse<RateResponse>>(`${this.baseUrl}/response-rate`)
      .pipe(map((response) => response.data));
  }

  getOfferRate(): Observable<RateResponse> {
    return this.http.get<ApiResponse<RateResponse>>(`${this.baseUrl}/offer-rate`).pipe(map((response) => response.data));
  }

  getSourcePerformance(): Observable<SourcePerformanceResponse> {
    return this.http
      .get<ApiResponse<SourcePerformanceResponse>>(`${this.baseUrl}/source-performance`)
      .pipe(map((response) => response.data));
  }

  getSkillsGap(): Observable<SkillCount[]> {
    return this.http.get<ApiResponse<SkillCount[]>>(`${this.baseUrl}/skills-gap`).pipe(map((response) => response.data));
  }

  getConversionFunnel(): Observable<ConversionFunnelResponse> {
    return this.http
      .get<ApiResponse<ConversionFunnelResponse>>(`${this.baseUrl}/conversion-funnel`)
      .pipe(map((response) => response.data));
  }

  getReferralEffectiveness(): Observable<ReferralEffectivenessResponse> {
    return this.http
      .get<ApiResponse<ReferralEffectivenessResponse>>(`${this.baseUrl}/referral-effectiveness`)
      .pipe(map((response) => response.data));
  }

  getTimeToOffer(): Observable<TimeToOfferResponse> {
    return this.http
      .get<ApiResponse<TimeToOfferResponse>>(`${this.baseUrl}/time-to-offer`)
      .pipe(map((response) => response.data));
  }
}
