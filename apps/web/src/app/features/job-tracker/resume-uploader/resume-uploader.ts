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

  protected readonly resumes = signal<Resume[]>([]);
  protected readonly skills = signal<Skill[]>([]);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.refresh();
    this.resumeApi.skillLibrary().subscribe({ next: (skills) => this.skills.set(skills) });
  }

  private refresh(): void {
    this.resumeApi.list().subscribe({ next: (resumes) => this.resumes.set(resumes) });
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.error.set('');
    this.resumeApi.upload(file, file.name, this.resumes().length === 0).subscribe({
      next: () => {
        this.uploading.set(false);
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
}
