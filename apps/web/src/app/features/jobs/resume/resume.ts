import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { ResumeUploadResponse } from '../../../core/models/job-tracker.model';
import { ResumeApiService } from '../../../core/services/resume-api.service';

@Component({
  selector: 'app-jobs-resume',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './resume.html',
  styleUrl: './resume.scss',
})
export class JobsResume implements OnInit {
  private readonly resumeApi = inject(ResumeApiService);

  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly activeResume = signal<ResumeUploadResponse | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.resumeApi.getActiveResume().subscribe({
      next: (resume) => {
        this.activeResume.set(resume);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.resumeApi.uploadResume(file).subscribe({
      next: (resume) => {
        this.activeResume.set(resume);
        this.uploading.set(false);
      },
      error: (err) => {
        this.uploading.set(false);
        this.errorMessage.set(this.messageFor(err, 'Could not upload resume'));
      },
    });
  }

  private messageFor(err: unknown, fallback: string): string {
    const httpError = err as { error?: { message?: string } };
    return httpError?.error?.message ?? fallback;
  }
}
