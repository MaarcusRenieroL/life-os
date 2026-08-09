import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApplicationResponse, JobResponse } from '../../../core/models/job-tracker.model';
import { ApplicationApiService } from '../../../core/services/application-api.service';
import { JobApiService } from '../../../core/services/job-api.service';

@Component({
  selector: 'app-jobs-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class JobsDashboard implements OnInit {
  private readonly jobApi = inject(JobApiService);
  private readonly applicationApi = inject(ApplicationApiService);

  protected readonly loading = signal(true);
  protected readonly jobs = signal<JobResponse[]>([]);
  protected readonly applications = signal<ApplicationResponse[]>([]);

  protected readonly activeApplications = computed(
    () => this.applications().filter((a) => a.status === 'ACTIVE').length,
  );
  protected readonly offers = computed(() => this.applications().filter((a) => a.currentStage === 'OFFER').length);
  protected readonly interviewing = computed(
    () => this.applications().filter((a) => a.currentStage === 'INTERVIEWING').length,
  );

  ngOnInit(): void {
    this.jobApi.getJobs().subscribe({ next: (jobs) => this.jobs.set(jobs) });
    this.applicationApi.getApplications().subscribe({
      next: (applications) => {
        this.applications.set(applications);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
