import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { JobApiService } from '../../../core/services/job-api.service';
import { JobListing } from '../../../core/models/job-tracker.model';

interface FitView {
  score: number | null;
  strong: string[];
  partial: string[];
  missing: string[];
  redFlags: string[];
}

@Component({
  selector: 'app-job-discovery',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './discovery.html',
})
export class JobDiscovery {
  private readonly jobApi = inject(JobApiService);
  private readonly router = inject(Router);

  protected url = '';
  protected pastedText = '';

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly needsText = signal(false);
  protected readonly job = signal<JobListing | null>(null);
  protected readonly fit = signal<FitView | null>(null);

  protected analyze(): void {
    if (!this.url.trim() && !this.pastedText.trim()) {
      this.error.set('Paste a job link first.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.job.set(null);
    this.fit.set(null);

    this.jobApi.fromLink(this.url.trim(), this.pastedText.trim() || undefined).subscribe({
      next: (job) => {
        this.busy.set(false);
        this.needsText.set(false);
        this.pastedText = '';
        this.job.set(job);
        this.fit.set(this.toFitView(job));
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        if (err.status === 422) {
          this.needsText.set(true);
          this.error.set(
            err.error?.message ?? 'That site blocked the read — paste the description below.',
          );
        } else {
          this.error.set(err.error?.message ?? 'Could not add that job.');
        }
      },
    });
  }

  protected reset(): void {
    this.url = '';
    this.pastedText = '';
    this.job.set(null);
    this.fit.set(null);
    this.error.set('');
    this.needsText.set(false);
  }

  protected openJob(): void {
    const job = this.job();
    if (job) {
      this.router.navigate(['/jobs', job.id]);
    }
  }

  private toFitView(job: JobListing): FitView {
    const ex = (job.fitExplanation ?? {}) as Record<string, unknown>;
    const list = (key: string): string[] =>
      Array.isArray(ex[key]) ? (ex[key] as unknown[]).map((v) => String(v)) : [];
    return {
      score: job.fitScore,
      strong: list('strongMatches'),
      partial: list('partialMatches'),
      missing: list('missingSkills'),
      redFlags: list('redFlags'),
    };
  }
}
