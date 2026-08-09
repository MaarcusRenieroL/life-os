import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  AnalyticsDashboardResponse,
  ApplicationStage,
  ConversionFunnelResponse,
  JobSource,
  PipelineResponse,
  RateResponse,
  ReferralEffectivenessResponse,
  SkillCount,
  SourcePerformanceResponse,
  TimeToOfferResponse,
} from '../../../core/models/job-tracker.model';
import { JobAnalyticsApiService } from '../../../core/services/job-analytics-api.service';

interface PipelineRow {
  stage: ApplicationStage;
  label: string;
  count: number;
  pct: number;
  colorClass: string;
}

interface SourceRow {
  source: JobSource;
  count: number;
  pct: number;
}

interface FunnelStep {
  label: string;
  count: number;
  pct: number;
}

const STAGE_LABELS: Record<ApplicationStage, string> = {
  APPLIED: 'Applied',
  RECRUITER_SCREENING: 'Recruiter screening',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

const STAGE_COLORS: Record<ApplicationStage, string> = {
  APPLIED: 'bg-foreground/25',
  RECRUITER_SCREENING: 'bg-warning',
  INTERVIEWING: 'bg-primary',
  OFFER: 'bg-primary',
  REJECTED: 'bg-destructive',
  WITHDRAWN: 'bg-foreground/15',
};

@Component({
  selector: 'app-jobs-analytics',
  standalone: true,
  imports: [DecimalPipe, PercentPipe, RouterLink],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class JobsAnalytics implements OnInit {
  private readonly analyticsApi = inject(JobAnalyticsApiService);

  protected readonly loading = signal(true);
  protected readonly dashboard = signal<AnalyticsDashboardResponse | null>(null);
  protected readonly pipeline = signal<PipelineResponse>({});
  protected readonly sourcePerformance = signal<SourcePerformanceResponse>({});
  protected readonly skillsGap = signal<SkillCount[]>([]);
  protected readonly conversionFunnel = signal<ConversionFunnelResponse | null>(null);
  protected readonly referralEffectiveness = signal<ReferralEffectivenessResponse | null>(null);
  protected readonly timeToOffer = signal<TimeToOfferResponse | null>(null);
  protected readonly responseRate = signal<RateResponse | null>(null);

  protected readonly pipelineRows = computed<PipelineRow[]>(() => {
    const pipeline = this.pipeline();
    const total = Object.values(pipeline).reduce((sum, c) => sum + (c ?? 0), 0);
    return (Object.keys(STAGE_LABELS) as ApplicationStage[])
      .map((stage) => ({
        stage,
        label: STAGE_LABELS[stage],
        count: pipeline[stage] ?? 0,
        pct: total === 0 ? 0 : ((pipeline[stage] ?? 0) / total) * 100,
        colorClass: STAGE_COLORS[stage],
      }))
      .filter((row) => row.count > 0);
  });

  protected readonly sourceRows = computed<SourceRow[]>(() => {
    const sources = this.sourcePerformance();
    const total = Object.values(sources).reduce((sum, c) => sum + (c ?? 0), 0);
    return (Object.entries(sources) as [JobSource, number][])
      .map(([source, count]) => ({ source, count, pct: total === 0 ? 0 : (count / total) * 100 }))
      .sort((a, b) => b.count - a.count);
  });

  protected readonly maxSkillCount = computed(() => Math.max(...this.skillsGap().map((s) => s.count), 1));

  protected readonly funnelSteps = computed<FunnelStep[]>(() => {
    const funnel = this.conversionFunnel();
    if (!funnel) return [];
    const steps: FunnelStep[] = [
      { label: 'Applied', count: funnel.applied, pct: 100 },
      {
        label: 'Recruiter screening',
        count: funnel.recruiterScreening,
        pct: funnel.applied === 0 ? 0 : (funnel.recruiterScreening / funnel.applied) * 100,
      },
      {
        label: 'Interviewing',
        count: funnel.interviewing,
        pct: funnel.applied === 0 ? 0 : (funnel.interviewing / funnel.applied) * 100,
      },
      { label: 'Offer', count: funnel.offer, pct: funnel.applied === 0 ? 0 : (funnel.offer / funnel.applied) * 100 },
    ];
    return steps;
  });

  ngOnInit(): void {
    forkJoin({
      dashboard: this.analyticsApi.getDashboard(),
      pipeline: this.analyticsApi.getPipeline(),
      sourcePerformance: this.analyticsApi.getSourcePerformance(),
      skillsGap: this.analyticsApi.getSkillsGap(),
      conversionFunnel: this.analyticsApi.getConversionFunnel(),
      referralEffectiveness: this.analyticsApi.getReferralEffectiveness(),
      timeToOffer: this.analyticsApi.getTimeToOffer(),
      responseRate: this.analyticsApi.getResponseRate(),
    }).subscribe({
      next: (result) => {
        this.dashboard.set(result.dashboard);
        this.pipeline.set(result.pipeline);
        this.sourcePerformance.set(result.sourcePerformance);
        this.skillsGap.set(result.skillsGap);
        this.conversionFunnel.set(result.conversionFunnel);
        this.referralEffectiveness.set(result.referralEffectiveness);
        this.timeToOffer.set(result.timeToOffer);
        this.responseRate.set(result.responseRate);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
