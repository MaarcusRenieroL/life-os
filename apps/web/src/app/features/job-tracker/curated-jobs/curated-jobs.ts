import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { JobApiService } from '../../../core/services/job-api.service';
import { ApplicationApiService } from '../../../core/services/application-api.service';
import { JobListing } from '../../../core/models/job-tracker.model';

type SortKey = 'score' | 'salary' | 'posted';

@Component({
  selector: 'app-curated-jobs',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './curated-jobs.html',
})
export class CuratedJobs implements OnInit {
  private readonly jobApi = inject(JobApiService);
  private readonly applicationApi = inject(ApplicationApiService);

  protected readonly jobs = signal<JobListing[]>([]);
  protected readonly loading = signal(true);
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly sortKey = signal<SortKey>('score');
  protected readonly applying = signal(false);

  ngOnInit(): void {
    this.jobApi.curated(undefined, 0, 20).subscribe({
      next: (page) => {
        this.jobs.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected readonly sortedJobs = computed(() => {
    const key = this.sortKey();
    return [...this.jobs()].sort((a, b) => {
      if (key === 'salary') {
        return (b.salaryMax ?? 0) - (a.salaryMax ?? 0);
      }
      if (key === 'posted') {
        return (b.postedDate ?? '').localeCompare(a.postedDate ?? '');
      }
      return (b.fitScore ?? 0) - (a.fitScore ?? 0);
    });
  });

  protected readonly averageScore = computed(() => {
    const scored = this.jobs().filter((job) => job.fitScore != null);
    if (!scored.length) {
      return 0;
    }
    return Math.round(scored.reduce((sum, job) => sum + (job.fitScore ?? 0), 0) / scored.length);
  });

  protected toggle(jobId: string): void {
    const next = new Set(this.selected());
    next.has(jobId) ? next.delete(jobId) : next.add(jobId);
    this.selected.set(next);
  }

  protected isSelected(jobId: string): boolean {
    return this.selected().has(jobId);
  }

  protected applyToSelected(): void {
    const ids = [...this.selected()];
    if (!ids.length) {
      return;
    }
    this.applying.set(true);
    let remaining = ids.length;
    for (const jobListingId of ids) {
      this.applicationApi.create({ jobListingId }).subscribe({
        next: () => {
          if (--remaining === 0) {
            this.applying.set(false);
            this.selected.set(new Set());
          }
        },
        error: () => {
          if (--remaining === 0) {
            this.applying.set(false);
          }
        },
      });
    }
  }
}
