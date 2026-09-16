import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { JobApiService } from '../../../core/services/job-api.service';
import { JobListing, JobStatus, JOB_STATUSES } from '../../../core/models/job-tracker.model';

@Component({
  selector: 'app-curated-jobs',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './curated-jobs.html',
})
export class CuratedJobs implements OnInit {
  private readonly jobApi = inject(JobApiService);

  protected readonly jobs = signal<JobListing[]>([]);
  protected readonly loading = signal(true);
  protected readonly statuses = JOB_STATUSES;

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.jobApi.list().subscribe({
      next: (jobs) => {
        this.jobs.set(jobs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected setStatus(job: JobListing, status: JobStatus): void {
    this.jobApi.setStatus(job.id, status).subscribe({
      next: (updated) =>
        this.jobs.update((list) => list.map((j) => (j.id === updated.id ? updated : j))),
    });
  }

  protected remove(job: JobListing): void {
    this.jobApi.delete(job.id).subscribe({
      next: () => this.jobs.update((list) => list.filter((j) => j.id !== job.id)),
    });
  }
}
