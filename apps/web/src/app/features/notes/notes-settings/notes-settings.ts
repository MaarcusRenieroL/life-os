import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { NoteSettingsApiService } from '../../../core/services/note-settings-api.service';
import { NotesApiService } from '../../../core/services/notes-api.service';
import { NoteTemplatesApiService } from '../../../core/services/note-templates-api.service';
import { NoteSettings, TrashedNote } from '../../../core/models/notes.model';
import { NOTE_TYPE_LIST } from '../shared/note-type.util';
import { RelativeTimePipe } from '../shared/relative-time.pipe';
import { downloadViaBlob } from '../shared/file-download.util';

@Component({
  selector: 'app-notes-settings',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    InputNumberModule,
    RadioButtonModule,
    ToggleSwitchModule,
    RelativeTimePipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './notes-settings.html',
  styleUrl: './notes-settings.scss',
})
export class NotesSettings implements OnInit {
  private readonly settingsApi = inject(NoteSettingsApiService);
  private readonly notesApi = inject(NotesApiService);
  private readonly templatesApi = inject(NoteTemplatesApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly http = inject(HttpClient);

  protected readonly noteTypes = NOTE_TYPE_LIST;

  protected readonly settings = signal<NoteSettings | null>(null);
  protected readonly loadingSettings = signal(true);
  protected readonly savingSettings = signal(false);

  protected readonly trash = signal<TrashedNote[]>([]);
  protected readonly loadingTrash = signal(true);

  protected readonly templateCount = signal<number | null>(null);
  protected readonly deletingAll = signal(false);

  ngOnInit(): void {
    this.loadSettings();
    this.loadTrash();
    this.templatesApi.list().subscribe((page) => this.templateCount.set(page.totalElements));
  }

  private loadSettings(): void {
    this.loadingSettings.set(true);
    this.settingsApi.get().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.loadingSettings.set(false);
      },
      error: () => this.loadingSettings.set(false),
    });
  }

  private loadTrash(): void {
    this.loadingTrash.set(true);
    this.notesApi.trash().subscribe({
      next: (trash) => {
        this.trash.set(trash);
        this.loadingTrash.set(false);
      },
      error: () => this.loadingTrash.set(false),
    });
  }

  setDefaultNoteType(value: string): void {
    this.patchSettings({ defaultNoteType: value as NoteSettings['defaultNoteType'] });
  }

  toggleAutoArchive(enabled: boolean): void {
    this.patchSettings({ autoArchiveEnabled: enabled });
  }

  setAutoArchiveDays(days: number): void {
    this.patchSettings({ autoArchiveDays: days });
  }

  private patchSettings(patch: Partial<NoteSettings>): void {
    this.savingSettings.set(true);
    this.settingsApi.update(patch).subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.savingSettings.set(false);
      },
      error: () => this.savingSettings.set(false),
    });
  }

  exportAll(format: 'markdown' | 'pdf' | 'json'): void {
    const extension = format === 'json' ? 'json' : 'zip';
    downloadViaBlob(this.http, this.settingsApi.exportAllUrl(format), `notes-export.${extension}`);
  }

  restoreFromTrash(note: TrashedNote): void {
    this.notesApi.restore(note.id).subscribe(() => this.loadTrash());
  }

  confirmDeleteForever(note: TrashedNote): void {
    this.confirmationService.confirm({
      header: 'Delete forever',
      message: `Permanently delete "${note.title}"? This can't be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: 'Delete forever' },
      rejectButtonProps: { severity: 'secondary', text: true, label: 'Cancel' },
      accept: () => {
        this.notesApi.permanentlyDelete(note.id).subscribe(() => this.loadTrash());
      },
    });
  }

  confirmDeleteAllData(): void {
    this.confirmationService.confirm({
      header: 'Delete all notes data',
      message:
        'This permanently deletes every note, folder, tag, and template. Attachments and version history go with them. This cannot be undone.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: "I'm sure, delete everything" },
      rejectButtonProps: { severity: 'secondary', text: true, label: 'Cancel' },
      accept: () => {
        this.deletingAll.set(true);
        this.settingsApi.deleteAllData().subscribe({
          next: () => {
            this.deletingAll.set(false);
            this.loadTrash();
          },
          error: () => this.deletingAll.set(false),
        });
      },
    });
  }
}
