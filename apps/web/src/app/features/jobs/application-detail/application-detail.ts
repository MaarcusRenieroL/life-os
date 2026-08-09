import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApplicationResponse, ApplicationStage, JobResponse } from '../../../core/models/job-tracker.model';
import { ApplicationApiService } from '../../../core/services/application-api.service';
import { JobApiService } from '../../../core/services/job-api.service';

const STAGE_OPTIONS: ApplicationStage[] = [
  'APPLIED',
  'RECRUITER_SCREENING',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
];

@Component({
  selector: 'app-jobs-application-detail',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './application-detail.html',
  styleUrl: './application-detail.scss',
})
export class JobsApplicationDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly applicationApi = inject(ApplicationApiService);
  private readonly jobApi = inject(JobApiService);

  protected readonly loading = signal(true);
  protected readonly application = signal<ApplicationResponse | null>(null);
  protected readonly job = signal<JobResponse | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly stageOptions = STAGE_OPTIONS;

  protected readonly resumeText = signal('');
  protected readonly scoring = signal(false);
  protected readonly tailoring = signal(false);
  protected readonly savingReferral = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.load(id);
  }

  protected changeStage(stage: ApplicationStage): void {
    const application = this.application();
    if (!application) {
      return;
    }
    this.applicationApi.updateApplication(application.id, { currentStage: stage }).subscribe({
      next: (updated) => this.application.set(updated),
      error: (err) => this.errorMessage.set(this.messageFor(err, 'Could not update stage')),
    });
  }

  protected toggleReferral(): void {
    const application = this.application();
    if (!application) {
      return;
    }
    this.savingReferral.set(true);
    this.applicationApi
      .updateApplication(application.id, { referralReceived: !application.referralReceived })
      .subscribe({
        next: (updated) => {
          this.application.set(updated);
          this.savingReferral.set(false);
        },
        error: (err) => {
          this.savingReferral.set(false);
          this.errorMessage.set(this.messageFor(err, 'Could not update referral status'));
        },
      });
  }

  protected score(): void {
    const application = this.application();
    if (!application || !this.resumeText().trim()) {
      return;
    }
    this.scoring.set(true);
    this.applicationApi.scoreApplication(application.id, { resumeText: this.resumeText() }).subscribe({
      next: (updated) => {
        this.application.set(updated);
        this.scoring.set(false);
      },
      error: (err) => {
        this.scoring.set(false);
        this.errorMessage.set(this.messageFor(err, 'Could not score application'));
      },
    });
  }

  protected tailorResume(): void {
    const application = this.application();
    if (!application) {
      return;
    }
    this.tailoring.set(true);
    this.applicationApi.tailorResume(application.id).subscribe({
      next: (updated) => {
        this.application.set(updated);
        this.tailoring.set(false);
      },
      error: (err) => {
        this.tailoring.set(false);
        this.errorMessage.set(this.messageFor(err, 'Could not tailor resume'));
      },
    });
  }

  protected back(): void {
    this.router.navigate(['/jobs/applications']);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.applicationApi.getApplication(id).subscribe({
      next: (application) => {
        this.application.set(application);
        this.jobApi.getJob(application.jobId).subscribe({
          next: (job) => {
            this.job.set(job);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(this.messageFor(err, 'Could not load application'));
      },
    });
  }

  private messageFor(err: unknown, fallback: string): string {
    const httpError = err as { error?: { message?: string } };
    return httpError?.error?.message ?? fallback;
  }
}
