import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';

import { NoteTemplatesApiService } from '../../../core/services/note-templates-api.service';
import { NoteTemplate } from '../../../core/models/notes.model';
import { categoryColor, categoryIcon } from '../shared/template-category.util';

@Component({
  selector: 'app-note-templates',
  standalone: true,
  imports: [FormsModule, ButtonModule, ConfirmDialogModule, DialogModule, InputTextModule, SelectButtonModule, TextareaModule],
  providers: [ConfirmationService],
  templateUrl: './note-templates.html',
  styleUrl: './note-templates.scss',
})
export class NoteTemplates implements OnInit {
  private readonly templatesApi = inject(NoteTemplatesApiService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly templates = signal<NoteTemplate[]>([]);
  protected readonly loading = signal(true);
  protected readonly categoryFilter = signal<string | null>(null);

  protected readonly categoryColor = categoryColor;
  protected readonly categoryIcon = categoryIcon;

  protected readonly selectedTemplate = signal<NoteTemplate | null>(null);
  protected readonly useDialogVisible = signal(false);
  protected readonly useTitle = signal('');

  protected readonly editorVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly draftName = signal('');
  protected readonly draftCategory = signal('');
  protected readonly draftContent = signal('');

  protected readonly categoryOptions = computed(() => {
    const categories = new Set(this.templates().map((t) => t.category).filter((c): c is string => !!c));
    return [{ label: 'All', value: null }, ...[...categories].sort().map((c) => ({ label: c, value: c }))];
  });

  protected readonly filteredTemplates = computed(() => {
    const filter = this.categoryFilter();
    return filter ? this.templates().filter((t) => t.category === filter) : this.templates();
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.templatesApi.list().subscribe({
      next: (page) => {
        this.templates.set(page.content);
        this.loading.set(false);
        if (!this.selectedTemplate() && page.content.length > 0) {
          this.selectedTemplate.set(page.content[0]);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  select(template: NoteTemplate): void {
    this.selectedTemplate.set(template);
  }

  openUseDialog(template: NoteTemplate): void {
    this.selectedTemplate.set(template);
    this.useTitle.set(template.name);
    this.useDialogVisible.set(true);
  }

  confirmUse(): void {
    const template = this.selectedTemplate();
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

  duplicate(template: NoteTemplate): void {
    this.templatesApi.create(`${template.name} (copy)`, template.content ?? '', template.category ?? undefined).subscribe(() => this.load());
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

  confirmDelete(template: NoteTemplate): void {
    this.confirmationService.confirm({
      header: 'Delete template',
      message: `Delete "${template.name}"? This can't be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: 'Delete' },
      rejectButtonProps: { severity: 'secondary', text: true, label: 'Cancel' },
      accept: () => {
        this.templatesApi.delete(template.id).subscribe(() => {
          if (this.selectedTemplate()?.id === template.id) {
            this.selectedTemplate.set(null);
          }
          this.load();
        });
      },
    });
  }
}
