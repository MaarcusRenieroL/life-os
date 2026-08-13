import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { NoteTemplatesApiService } from '../../../core/services/note-templates-api.service';
import { NoteTemplate } from '../../../core/models/notes.model';

@Component({
  selector: 'app-note-templates',
  standalone: true,
  imports: [FormsModule, ButtonModule, DialogModule],
  templateUrl: './note-templates.html',
  styleUrl: './note-templates.scss',
})
export class NoteTemplates implements OnInit {
  private readonly templatesApi = inject(NoteTemplatesApiService);
  private readonly router = inject(Router);

  protected readonly templates = signal<NoteTemplate[]>([]);
  protected readonly loading = signal(true);

  protected readonly previewTemplate = signal<NoteTemplate | null>(null);
  protected readonly useDialogVisible = signal(false);
  protected readonly useTitle = signal('');

  protected readonly editorVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly draftName = signal('');
  protected readonly draftCategory = signal('');
  protected readonly draftContent = signal('');

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.templatesApi.list().subscribe({
      next: (page) => {
        this.templates.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openPreview(template: NoteTemplate): void {
    this.previewTemplate.set(template);
  }

  closePreview(): void {
    this.previewTemplate.set(null);
  }

  openUseDialog(template: NoteTemplate): void {
    this.previewTemplate.set(template);
    this.useTitle.set(template.name);
    this.useDialogVisible.set(true);
  }

  confirmUse(): void {
    const template = this.previewTemplate();
    const title = this.useTitle().trim();
    if (!template || !title) return;

    this.templatesApi.use(template.id, title).subscribe((note) => {
      this.useDialogVisible.set(false);
      this.router.navigate(['/notes', note.id]);
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.draftName.set('');
    this.draftCategory.set('');
    this.draftContent.set('');
    this.editorVisible.set(true);
  }

  openEdit(template: NoteTemplate): void {
    this.editingId.set(template.id);
    this.draftName.set(template.name);
    this.draftCategory.set(template.category ?? '');
    this.draftContent.set(template.content ?? '');
    this.editorVisible.set(true);
  }

  saveTemplate(): void {
    const name = this.draftName().trim();
    if (!name) return;

    const id = this.editingId();
    const obs = id
      ? this.templatesApi.update(id, name, this.draftContent(), this.draftCategory() || undefined)
      : this.templatesApi.create(name, this.draftContent(), this.draftCategory() || undefined);

    obs.subscribe(() => {
      this.editorVisible.set(false);
      this.load();
    });
  }

  deleteTemplate(template: NoteTemplate, event: Event): void {
    event.stopPropagation();
    this.templatesApi.delete(template.id).subscribe(() => this.load());
  }
}
