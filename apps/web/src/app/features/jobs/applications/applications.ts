import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ApplicationResponse, ApplicationStage } from '../../../core/models/job-tracker.model';
import { ApplicationApiService } from '../../../core/services/application-api.service';

const STAGE_ORDER: ApplicationStage[] = [
  'APPLIED',
  'RECRUITER_SCREENING',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
];

const STAGE_LABELS: Record<ApplicationStage, string> = {
  APPLIED: 'Applied',
  RECRUITER_SCREENING: 'Recruiter Screening',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

@Component({
  selector: 'app-jobs-applications',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './applications.html',
  styleUrl: './applications.scss',
})
export class JobsApplications implements OnInit {
  private readonly applicationApi = inject(ApplicationApiService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly applications = signal<ApplicationResponse[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly stages = STAGE_ORDER;
  protected readonly stageLabels = STAGE_LABELS;

  protected readonly columns = computed(() => {
    const grouped = new Map<ApplicationStage, ApplicationResponse[]>();
    for (const stage of STAGE_ORDER) {
      grouped.set(stage, []);
    }
    for (const app of this.applications()) {
      grouped.get(app.currentStage)?.push(app);
    }
    return grouped;
  });

  ngOnInit(): void {
    this.load();
  }

  protected open(application: ApplicationResponse): void {
    this.router.navigate(['/jobs/applications', application.id]);
  }

  protected nextStage(application: ApplicationResponse, event: Event): void {
    event.stopPropagation();
    const currentIndex = STAGE_ORDER.indexOf(application.currentStage);
    if (currentIndex < 0 || currentIndex >= STAGE_ORDER.length - 3) {
      return;
    }
    const nextStage = STAGE_ORDER[currentIndex + 1];
    this.applicationApi.updateApplication(application.id, { currentStage: nextStage }).subscribe({
      next: () => this.load(),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.applicationApi.getApplications().subscribe({
      next: (applications) => {
        this.applications.set(applications);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(this.messageFor(err, 'Could not load applications'));
      },
    });
  }

  private messageFor(err: unknown, fallback: string): string {
    const httpError = err as { error?: { message?: string } };
    return httpError?.error?.message ?? fallback;
  }
}
