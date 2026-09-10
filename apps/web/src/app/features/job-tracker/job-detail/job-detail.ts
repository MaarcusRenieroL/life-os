import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { JobApiService } from '../../../core/services/job-api.service';
import { JobListing, JobStatus, JOB_STATUSES } from '../../../core/models/job-tracker.model';

interface FitView {
  score: number | null;
  strong: string[];
  partial: string[];
  missing: string[];
  redFlags: string[];
}

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './job-detail.html',
})
export class JobDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly jobApi = inject(JobApiService);

  protected readonly job = signal<JobListing | null>(null);
  protected readonly fit = signal<FitView | null>(null);
  protected readonly loading = signal(true);
  protected readonly statuses = JOB_STATUSES;

  ngOnInit(): void {
    const jobId = this.route.snapshot.paramMap.get('jobId');
    if (!jobId) {
      this.loading.set(false);
      return;
    }
    this.jobApi.get(jobId).subscribe({
      next: (job) => {
        this.job.set(job);
        this.fit.set(this.toFitView(job));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected setStatus(status: JobStatus): void {
    const job = this.job();
    if (!job) {
      return;
    }
    this.jobApi.setStatus(job.id, status).subscribe({ next: (updated) => this.job.set(updated) });
  }

  protected rescore(): void {
    const job = this.job();
    if (!job) {
      return;
    }
    this.jobApi.rescore(job.id).subscribe({
      next: (result) =>
        this.fit.set({
          score: result.score,
          strong: this.list(result.explanation, 'strongMatches'),
          partial: this.list(result.explanation, 'partialMatches'),
          missing: this.list(result.explanation, 'missingSkills'),
          redFlags: this.list(result.explanation, 'redFlags'),
        }),
    });
  }

  private toFitView(job: JobListing): FitView {
    return {
      score: job.fitScore,
      strong: this.list(job.fitExplanation, 'strongMatches'),
      partial: this.list(job.fitExplanation, 'partialMatches'),
      missing: this.list(job.fitExplanation, 'missingSkills'),
      redFlags: this.list(job.fitExplanation, 'redFlags'),
    };
  }

  private list(ex: Record<string, unknown> | null, key: string): string[] {
    const value = (ex ?? {})[key];
    return Array.isArray(value) ? value.map((v) => String(v)) : [];
  }
}
