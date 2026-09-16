import { Component, OnInit, inject, signal } from '@angular/core';

import { ResumeApiService } from '../../../core/services/resume-api.service';
import { Resume, Skill } from '../../../core/models/job-tracker.model';

@Component({
  selector: 'app-resume-uploader',
  standalone: true,
  imports: [],
  templateUrl: './resume-uploader.html',
})
export class ResumeUploader implements OnInit {
  private readonly resumeApi = inject(ResumeApiService);

  protected readonly resume = signal<Resume | null>(null);
  protected readonly skills = signal<Skill[]>([]);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly note = signal('');

  protected statusLabel(status: string | null): string {
    switch (status) {
      case 'COMPLETED':
        return 'parsed';
      case 'PROCESSING':
        return 'parsing…';
      case 'FAILED':
        return 'stored, not auto-parsed';
      default:
        return (status ?? 'pending').toLowerCase();
    }
  }

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.resumeApi.current().subscribe({
      next: (resume) => this.resume.set(resume),
      error: () => this.resume.set(null),
    });
    this.resumeApi.skillLibrary().subscribe({ next: (skills) => this.skills.set(skills) });
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.error.set('');
    this.note.set('');
    this.resumeApi.upload(file, file.name).subscribe({
      next: (resume) => {
        this.uploading.set(false);
        if (resume.extractionStatus === 'FAILED') {
          this.note.set('Uploaded. ' + (resume.extractionError ?? 'Text could not be auto-extracted.'));
        }
        this.refresh();
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err?.error?.message ?? 'Upload failed');
      },
    });
    input.value = '';
  }
}
