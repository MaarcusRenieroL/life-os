import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { JobResponse } from '../../../core/models/job-tracker.model';
import { ApplicationApiService } from '../../../core/services/application-api.service';
import { JobApiService } from '../../../core/services/job-api.service';

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

  ngOnInit(): void {
    this.load();
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
