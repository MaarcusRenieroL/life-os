import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';

import { NotesApiService } from '../../../core/services/notes-api.service';
import { GlobalAttachment, NoteSummary } from '../../../core/models/notes.model';
import { RelativeTimePipe } from '../shared/relative-time.pipe';
import { FileKind, fileIcon, fileKind, formatFileSize } from '../shared/file-type.util';
import { downloadViaBlob } from '../shared/file-download.util';

type TypeFilter = 'all' | 'image' | 'pdf' | 'doc';

@Component({
  selector: 'app-notes-attachments',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SelectModule,
    SelectButtonModule,
    RelativeTimePipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './notes-attachments.html',
  styleUrl: './notes-attachments.scss',
})
export class NotesAttachments implements OnInit {
  private readonly notesApi = inject(NotesApiService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly http = inject(HttpClient);

  protected readonly attachments = signal<GlobalAttachment[]>([]);
  protected readonly loading = signal(true);
  protected readonly searchTerm = signal('');
  protected readonly typeFilter = signal<TypeFilter>('all');
  protected readonly sort = signal<'newest' | 'oldest' | 'largest'>('newest');
  protected readonly selected = signal<GlobalAttachment | null>(null);

  protected readonly fileIcon = fileIcon;
  protected readonly formatFileSize = formatFileSize;

  protected readonly typeOptions: { label: string; value: TypeFilter }[] = [
    { label: 'All types', value: 'all' },
    { label: 'Images', value: 'image' },
    { label: 'PDFs', value: 'pdf' },
    { label: 'Docs', value: 'doc' },
  ];

  protected readonly sortOptions = [
    { label: 'Newest first', value: 'newest' },
    { label: 'Oldest first', value: 'oldest' },
    { label: 'Largest first', value: 'largest' },
  ];

  protected readonly totalSize = computed(() => this.attachments().reduce((sum, a) => sum + a.fileSize, 0));

  protected readonly filtered = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const type = this.typeFilter();

    let list = this.attachments().filter((a) => {
      if (query && !a.fileName.toLowerCase().includes(query)) return false;
      if (type !== 'all' && (fileKind(a.fileName) as FileKind) !== type) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (this.sort() === 'largest') return b.fileSize - a.fileSize;
      const diff = new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      return this.sort() === 'oldest' ? -diff : diff;
    });

    return list;
  });

  // Upload dialog - attachments always belong to a note (the schema has no
  // "unfiled" attachment concept), so unlike the mockup's bare drop zone,
  // uploading here means picking which note it attaches to first.
  protected readonly uploadDialogVisible = signal(false);
  protected readonly uploadNotes = signal<NoteSummary[]>([]);
  protected readonly uploadNoteId = signal<string | null>(null);
  protected readonly uploadFile = signal<File | null>(null);
  protected readonly uploading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.notesApi.allAttachments().subscribe({
      next: (attachments) => {
        this.attachments.set(attachments);
        this.loading.set(false);
        if (this.selected() && !attachments.some((a) => a.id === this.selected()?.id)) {
          this.selected.set(null);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  select(attachment: GlobalAttachment): void {
    this.selected.set(attachment);
  }

  goToNote(noteId: string): void {
    this.router.navigate(['/notes', noteId]);
  }

  downloadUrl(attachment: GlobalAttachment): string {
    return this.notesApi.downloadAttachmentUrl(attachment.noteId, attachment.id);
  }

  download(attachment: GlobalAttachment): void {
    downloadViaBlob(this.http, this.downloadUrl(attachment), attachment.fileName);
  }

  confirmDelete(attachment: GlobalAttachment): void {
    this.confirmationService.confirm({
      header: 'Delete attachment',
      message: `Delete "${attachment.fileName}"? This can't be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: 'Delete' },
      rejectButtonProps: { severity: 'secondary', text: true, label: 'Cancel' },
      accept: () => {
        this.notesApi.deleteAttachment(attachment.noteId, attachment.id).subscribe(() => this.load());
      },
    });
  }

  isImage(attachment: GlobalAttachment): boolean {
    return fileKind(attachment.fileName) === 'image';
  }

  openUploadDialog(): void {
    this.uploadNoteId.set(null);
    this.uploadFile.set(null);
    this.uploadDialogVisible.set(true);
    this.notesApi.list({ sort: 'modified', order: 'desc', size: 100 }).subscribe((page) => this.uploadNotes.set(page.content));
  }

  onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile.set(input.files?.[0] ?? null);
  }

  confirmUpload(): void {
    const noteId = this.uploadNoteId();
    const file = this.uploadFile();
    if (!noteId || !file) return;

    this.uploading.set(true);
    this.notesApi.uploadAttachment(noteId, file).subscribe({
      next: () => {
        this.uploading.set(false);
        this.uploadDialogVisible.set(false);
        this.load();
      },
      error: () => this.uploading.set(false),
    });
  }
}
