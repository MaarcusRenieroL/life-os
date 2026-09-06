import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ResumeApiService } from '../../../core/services/resume-api.service';
import { Resume, Skill } from '../../../core/models/job-tracker.model';

@Component({
  selector: 'app-resume-uploader',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './resume-uploader.html',
})
export class ResumeUploader implements OnInit {
  private readonly resumeApi = inject(ResumeApiService);

  protected readonly resumes = signal<Resume[]>([]);
  protected readonly skills = signal<Skill[]>([]);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly lastUploadNote = signal('');

  protected readonly baseResume = computed(
    () => this.resumes().find((r) => r.base) ?? this.resumes()[0] ?? null,
  );

  protected latexSource = '';
  protected readonly latexSaving = signal(false);
  protected readonly latexNote = signal('');

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
    this.resumeApi.skillLibrary().subscribe({ next: (skills) => this.skills.set(skills) });
  }

  private refresh(): void {
    this.resumeApi.list().subscribe({
      next: (resumes) => {
        this.resumes.set(resumes);
        const base = this.baseResume();
        if (base) {
          this.resumeApi.getLatexTemplate(base.id).subscribe({
            next: (source) => (this.latexSource = source ?? ''),
          });
        }
      },
    });
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.error.set('');
    this.lastUploadNote.set('');
    this.resumeApi.upload(file, file.name, this.resumes().length === 0).subscribe({
      next: (resume) => {
        this.uploading.set(false);
        if (resume.extractionStatus === 'FAILED') {
          this.lastUploadNote.set(
            'Uploaded. ' +
              (resume.extractionError ?? 'Text could not be auto-extracted') +
              ' You can still tailor it and edit sections in Resume Builder.',
          );
        }
        this.refresh();
        this.resumeApi.skillLibrary().subscribe({ next: (skills) => this.skills.set(skills) });
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err?.error?.message ?? 'Upload failed');
      },
    });
    input.value = '';
  }

  protected saveLatex(): void {
    const base = this.baseResume();
    if (!base) {
      this.latexNote.set('Upload a resume first, then attach its LaTeX template here.');
      return;
    }
    this.latexSaving.set(true);
    this.latexNote.set('');
    this.resumeApi.saveLatexTemplate(base.id, this.latexSource).subscribe({
      next: () => {
        this.latexSaving.set(false);
        this.latexNote.set(
          this.latexSource.trim()
            ? 'Template saved. "Tailor my resume for this" now re-renders on your template.'
            : 'Template cleared. Tailoring falls back to the plain layout.',
        );
        this.refresh();
      },
      error: (err) => {
        this.latexSaving.set(false);
        this.latexNote.set(err?.error?.message ?? 'Could not save template');
      },
    });
  }
}
