import { JsonPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { JobApiService } from '../../../core/services/job-api.service';
import { ApplicationApiService } from '../../../core/services/application-api.service';
import { JobFitResult, JobListing } from '../../../core/models/job-tracker.model';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [RouterLink, JsonPipe],
  templateUrl: './job-detail.html',
})
export class JobDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly jobApi = inject(JobApiService);
  private readonly applicationApi = inject(ApplicationApiService);

  protected readonly job = signal<JobListing | null>(null);
  protected readonly fit = signal<JobFitResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly message = signal('');

  ngOnInit(): void {
    const jobId = this.route.snapshot.paramMap.get('jobId');
    if (!jobId) {
      this.loading.set(false);
      return;
    }
    this.jobApi.get(jobId).subscribe({
      next: (job) => {
        this.job.set(job);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.jobApi.fitScore(jobId).subscribe({ next: (fit) => this.fit.set(fit) });
  }

  protected apply(): void {
    const job = this.job();
    if (!job) {
      return;
    }
    this.applicationApi.create({ jobListingId: job.id }).subscribe({
      next: () => this.message.set('Applied — added to your pipeline.'),
      error: (error) => this.message.set(error?.error?.message ?? 'Could not apply.'),
    });
  }

  protected save(): void {
    const job = this.job();
    if (!job) {
      return;
    }
    this.jobApi.update(job.id, { saved: !job.saved }).subscribe({ next: (updated) => this.job.set(updated) });
  }
}
