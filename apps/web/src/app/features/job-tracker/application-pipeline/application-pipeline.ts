import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApplicationApiService } from '../../../core/services/application-api.service';
import { Application, ApplicationStatus } from '../../../core/models/job-tracker.model';

const COLUMNS: ApplicationStatus[] = [
  'Discovered',
  'Saved',
  'Applied',
  'Recruiter Contacted',
  'Screening',
  'Technical Interview',
  'System Design Interview',
  'Final Interview',
  'Offer',
  'Rejected',
];

@Component({
  selector: 'app-application-pipeline',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './application-pipeline.html',
})
export class ApplicationPipeline implements OnInit {
  private readonly applicationApi = inject(ApplicationApiService);

  protected readonly columns = COLUMNS;
  protected readonly applications = signal<Application[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.applicationApi.list().subscribe({
      next: (applications) => {
        this.applications.set(applications);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected readonly grouped = computed(() => {
    const map = new Map<ApplicationStatus, Application[]>();
    for (const column of COLUMNS) {
      map.set(column, []);
    }
    for (const application of this.applications()) {
      map.get(application.status)?.push(application);
    }
    return map;
  });

  protected column(status: ApplicationStatus): Application[] {
    return this.grouped().get(status) ?? [];
  }

  protected advance(application: Application, status: ApplicationStatus): void {
    this.applicationApi.updateStatus(application.id, status).subscribe({
      next: (updated) =>
        this.applications.set(
          this.applications().map((item) => (item.id === updated.id ? updated : item)),
        ),
    });
  }

  protected daysInStatus(application: Application): number {
    return Math.floor((Date.now() - new Date(application.updatedAt).getTime()) / 86_400_000);
  }
}
