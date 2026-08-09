import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { JobResponse, JobSource, WorkModel } from '../../../core/models/job-tracker.model';
import { ApplicationApiService } from '../../../core/services/application-api.service';
import { JobApiService } from '../../../core/services/job-api.service';

const ALL = 'ALL';

@Component({
  selector: 'app-jobs-discover',
  standalone: true,
  imports: [],
  templateUrl: './discover.html',
  styleUrl: './discover.scss',
})
export class JobsDiscover implements OnInit {
  private readonly jobApi = inject(JobApiService);
  private readonly applicationApi = inject(ApplicationApiService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly jobs = signal<JobResponse[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly scraping = signal<string | null>(null);
  protected readonly applying = signal<string | null>(null);

  protected readonly searchTerm = signal('');
  protected readonly sourceFilter = signal<JobSource | typeof ALL>(ALL);
  protected readonly workModelFilter = signal<WorkModel | typeof ALL>(ALL);
  protected readonly all = ALL;

  protected readonly sources: JobSource[] = ['LINKEDIN', 'NAUKRI', 'WELLFOUND'];
  protected readonly workModels: WorkModel[] = ['REMOTE', 'HYBRID', 'ONSITE'];

  protected readonly filteredJobs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const source = this.sourceFilter();
    const workModel = this.workModelFilter();

    return this.jobs().filter((job) => {
      if (source !== ALL && job.source !== source) return false;
      if (workModel !== ALL && job.workModel !== workModel) return false;
      if (term.length === 0) return true;

      const haystack = [job.jobTitle, job.company, job.location, ...(job.requiredSkills ?? [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  });

  ngOnInit(): void {
    this.load();
  }

  protected setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  protected setSourceFilter(value: string): void {
    this.sourceFilter.set(value as JobSource | typeof ALL);
  }

  protected setWorkModelFilter(value: string): void {
    this.workModelFilter.set(value as WorkModel | typeof ALL);
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.sourceFilter.set(ALL);
    this.workModelFilter.set(ALL);
  }

  protected scrapeLinkedIn(): void {
    this.scraping.set('linkedin');
    this.jobApi.scrapeLinkedIn().subscribe({
      next: () => this.scraping.set(null),
      error: () => this.scraping.set(null),
    });
  }

  protected scrapeNaukri(): void {
    this.scraping.set('naukri');
    this.jobApi.scrapeNaukri().subscribe({
      next: () => this.scraping.set(null),
      error: () => this.scraping.set(null),
    });
  }

  protected refresh(): void {
    this.load();
  }

  protected apply(job: JobResponse): void {
    this.applying.set(job.id);
    this.applicationApi.createApplication({ jobId: job.id }).subscribe({
      next: (application) => {
        this.applying.set(null);
        this.router.navigate(['/jobs/applications', application.id]);
      },
      error: () => this.applying.set(null),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.jobApi.getJobs().subscribe({
      next: (jobs) => {
        this.jobs.set(jobs);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(this.messageFor(err, 'Could not load jobs'));
      },
    });
  }

  private messageFor(err: unknown, fallback: string): string {
    const httpError = err as { error?: { message?: string } };
    return httpError?.error?.message ?? fallback;
  }
}
