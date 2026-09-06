import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { JobApiService } from '../../../core/services/job-api.service';
import { ResumeApiService } from '../../../core/services/resume-api.service';
import { GmailApiService, GmailConnectionStatus } from '../../../core/services/gmail-api.service';
import { JobListing, Resume } from '../../../core/models/job-tracker.model';
import { downloadViaBlob } from '../../notes/shared/file-download.util';

interface FitView {
  score: number | null;
  strong: string[];
  partial: string[];
  missing: string[];
  redFlags: string[];
}

@Component({
  selector: 'app-job-discovery',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './discovery.html',
})
export class JobDiscovery implements OnInit {
  private readonly jobApi = inject(JobApiService);
  private readonly resumeApi = inject(ResumeApiService);
  private readonly gmailApi = inject(GmailApiService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected url = '';
  protected pastedText = '';

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly needsText = signal(false);
  protected readonly job = signal<JobListing | null>(null);
  protected readonly fit = signal<FitView | null>(null);

  protected readonly tailoring = signal(false);
  protected readonly tailorNote = signal('');

  protected readonly gmailStatus = signal<GmailConnectionStatus | null>(null);
  protected readonly gmailConnectUrl = this.gmailApi.connectUrl;
  protected readonly gmailNote = signal('');

  private baseResume: Resume | null = null;

  ngOnInit(): void {
    this.resumeApi.list().subscribe({
      next: (resumes) => (this.baseResume = resumes.find((r) => r.base) ?? resumes[0] ?? null),
    });
    this.gmailApi.status().subscribe({ next: (status) => this.gmailStatus.set(status) });
  }

  protected analyze(): void {
    if (!this.url.trim() && !this.pastedText.trim()) {
      this.error.set('Paste a job link first.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.tailorNote.set('');
    this.job.set(null);
    this.fit.set(null);

    this.jobApi.fromLink(this.url.trim(), this.pastedText.trim() || undefined).subscribe({
      next: (job) => {
        this.busy.set(false);
        this.needsText.set(false);
        this.pastedText = '';
        this.job.set(job);
        this.fit.set(this.toFitView(job));
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        if (err.status === 422) {
          this.needsText.set(true);
          this.error.set(err.error?.message ?? 'That site blocked the read — paste the description below.');
        } else {
          this.error.set(err.error?.message ?? 'Could not add that job.');
        }
      },
    });
  }

  protected reset(): void {
    this.url = '';
    this.pastedText = '';
    this.job.set(null);
    this.fit.set(null);
    this.error.set('');
    this.needsText.set(false);
    this.tailorNote.set('');
  }

  protected openJob(): void {
    const job = this.job();
    if (job) {
      this.router.navigate(['/jobs', job.id]);
    }
  }

  protected tailorResume(): void {
    const job = this.job();
    if (!job) {
      return;
    }
    if (!this.baseResume) {
      this.tailorNote.set('Upload a resume first (Resumes tab) so it can be tailored.');
      return;
    }
    this.tailoring.set(true);
    this.tailorNote.set('');
    this.resumeApi.tailor(this.baseResume.id, job.id).subscribe({
      next: (result) => {
        this.tailoring.set(false);
        this.tailorNote.set('Tailored resume ready — downloading…');
        downloadViaBlob(
          this.http,
          `/v1/resumes/${result.resume.id}/download`,
          `resume-${job.company}.pdf`.replace(/\s+/g, '-'),
        );
      },
      error: (err: HttpErrorResponse) => {
        this.tailoring.set(false);
        this.tailorNote.set(err.error?.message ?? 'Tailoring failed.');
      },
    });
  }

  protected syncGmail(all: boolean): void {
    this.busy.set(true);
    const sync = all ? this.gmailApi.syncAllJobEmails() : this.gmailApi.syncRecentJobEmails();
    sync.subscribe({
      next: (count) => {
        this.busy.set(false);
        this.gmailNote.set(`Synced ${count} job-search emails from Gmail.`);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.gmailNote.set(err.error?.message ?? 'Gmail sync failed.');
      },
    });
  }

  private toFitView(job: JobListing): FitView {
    const ex = (job.fitExplanation ?? {}) as Record<string, unknown>;
    const list = (key: string): string[] =>
      Array.isArray(ex[key]) ? (ex[key] as unknown[]).map((v) => String(v)) : [];
    return {
      score: job.fitScore,
      strong: list('strongMatches'),
      partial: list('partialMatches'),
      missing: list('missingSkills'),
      redFlags: list('redFlags'),
    };
  }
}
