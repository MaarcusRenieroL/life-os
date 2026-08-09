import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApplicationResponse, ApplicationStage, JobResponse } from '../../../core/models/job-tracker.model';
import { ApplicationApiService } from '../../../core/services/application-api.service';
import { JobApiService } from '../../../core/services/job-api.service';

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
  private readonly jobApi = inject(JobApiService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly applications = signal<ApplicationResponse[]>([]);
  protected readonly jobsById = signal<Map<string, JobResponse>>(new Map());
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly stages = STAGE_ORDER;
  protected readonly stageLabels = STAGE_LABELS;

  protected readonly selectMode = signal(false);
  protected readonly selectedIds = signal<Set<string>>(new Set());
  protected readonly bulkStageTarget = signal<ApplicationStage>('RECRUITER_SCREENING');
  protected readonly bulkBusy = signal(false);
  protected readonly searchTerm = signal('');

  protected readonly filteredApplications = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (term.length === 0) return this.applications();

    const jobs = this.jobsById();
    return this.applications().filter((app) => {
      const job = jobs.get(app.jobId);
      const haystack = [job?.jobTitle, job?.company, job?.location, app.notes].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  });

  protected readonly columns = computed(() => {
    const grouped = new Map<ApplicationStage, ApplicationResponse[]>();
    for (const stage of STAGE_ORDER) {
      grouped.set(stage, []);
    }
    for (const app of this.filteredApplications()) {
      grouped.get(app.currentStage)?.push(app);
    }
    return grouped;
  });

  protected readonly selectedCount = computed(() => this.selectedIds().size);

  ngOnInit(): void {
    this.load();
  }

  protected open(application: ApplicationResponse): void {
    if (this.selectMode()) {
      this.toggleSelected(application.id);
      return;
    }
    this.router.navigate(['/jobs/applications', application.id]);
  }

  protected jobFor(application: ApplicationResponse): JobResponse | undefined {
    return this.jobsById().get(application.jobId);
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

  protected setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  protected toggleSelectMode(): void {
    this.selectMode.update((v) => !v);
    this.selectedIds.set(new Set());
  }

  protected toggleSelected(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  protected isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  protected setBulkStageTarget(stage: string): void {
    this.bulkStageTarget.set(stage as ApplicationStage);
  }

  protected applyBulkStage(): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;
    this.bulkBusy.set(true);
    this.applicationApi.bulkUpdateStage(ids, this.bulkStageTarget()).subscribe({
      next: () => {
        this.bulkBusy.set(false);
        this.selectedIds.set(new Set());
        this.load();
      },
      error: (err) => {
        this.bulkBusy.set(false);
        this.errorMessage.set(this.messageFor(err, 'Could not update applications'));
      },
    });
  }

  protected bulkDelete(): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} application(s)? This cannot be undone.`)) return;
    this.bulkBusy.set(true);
    this.applicationApi.bulkDelete(ids).subscribe({
      next: () => {
        this.bulkBusy.set(false);
        this.selectedIds.set(new Set());
        this.load();
      },
      error: (err) => {
        this.bulkBusy.set(false);
        this.errorMessage.set(this.messageFor(err, 'Could not delete applications'));
      },
    });
  }

  protected exportSelectedCsv(): void {
    const ids =
      this.selectedIds().size > 0 ? this.selectedIds() : new Set(this.filteredApplications().map((a) => a.id));
    const rows = this.applications().filter((a) => ids.has(a.id));

    const header = ['Company', 'Job Title', 'Stage', 'Status', 'Applied On', 'Referral', 'AI Match %'];
    const csvRows = rows.map((a) => {
      const job = this.jobFor(a);
      return [
        job?.company ?? '',
        job?.jobTitle ?? '',
        this.stageLabels[a.currentStage],
        a.status ?? '',
        a.applicationDate ? new Date(a.applicationDate).toISOString().slice(0, 10) : '',
        a.referralReceived ? 'Yes' : 'No',
        a.aiScorePercentage?.toString() ?? '',
      ];
    });

    const csv = [header, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      applications: this.applicationApi.getApplications(),
      jobs: this.jobApi.getJobs(),
    }).subscribe({
      next: ({ applications, jobs }) => {
        this.applications.set(applications);
        this.jobsById.set(new Map(jobs.map((j) => [j.id, j])));
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
