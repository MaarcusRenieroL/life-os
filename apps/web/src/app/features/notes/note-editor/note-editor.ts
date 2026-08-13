import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { Subject, debounceTime } from 'rxjs';

import { NoteFoldersApiService } from '../../../core/services/note-folders-api.service';
import { NoteTagsApiService } from '../../../core/services/note-tags-api.service';
import { NotesApiService } from '../../../core/services/notes-api.service';
import { Folder, Note, NoteModuleType, NoteType, NoteVersion, Tag } from '../../../core/models/notes.model';

const NOTE_TYPES: { label: string; value: NoteType }[] = [
  { label: 'General', value: 'GENERAL' },
  { label: 'Meeting', value: 'MEETING' },
  { label: 'Book', value: 'BOOK' },
  { label: 'Learning', value: 'LEARNING' },
  { label: 'Technical', value: 'TECHNICAL' },
  { label: 'Snippet', value: 'SNIPPET' },
  { label: 'Research', value: 'RESEARCH' },
  { label: 'Checklist', value: 'CHECKLIST' },
  { label: 'Travel', value: 'TRAVEL' },
  { label: 'Decision', value: 'DECISION' },
];

const MODULE_TYPES: NoteModuleType[] = ['PROJECT', 'GOAL', 'TASK', 'JOB_APPLICATION', 'HABIT'];

@Component({
  selector: 'app-note-editor-page',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, ButtonModule, DialogModule, MenuModule, SelectModule],
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.scss',
})
export class NoteEditorPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notesApi = inject(NotesApiService);
  private readonly foldersApi = inject(NoteFoldersApiService);
  private readonly tagsApi = inject(NoteTagsApiService);

  @ViewChild('contentArea') contentArea?: ElementRef<HTMLDivElement>;

  protected readonly noteTypes = NOTE_TYPES;
  protected readonly moduleTypes = MODULE_TYPES;

  protected readonly note = signal<Note | null>(null);
  protected readonly loading = signal(true);
  protected readonly sidebarOpen = signal(true);
  protected readonly lastSavedAt = signal<Date | null>(null);
  protected readonly saving = signal(false);

  protected readonly allFolders = signal<Folder[]>([]);
  protected readonly allTags = signal<Tag[]>([]);
  protected readonly tagInput = signal('');
  protected readonly tagSuggestions = computed(() => {
    const q = this.tagInput().trim().toLowerCase();
    const existingIds = new Set(this.note()?.tags.map((t) => t.id) ?? []);
    if (!q) return [];
    return this.allTags().filter((t) => t.name.toLowerCase().includes(q) && !existingIds.has(t.id)).slice(0, 8);
  });

  protected readonly moduleLinkDialogVisible = signal(false);
  protected readonly moduleLinkType = signal<NoteModuleType>('PROJECT');
  protected readonly moduleLinkId = signal('');

  protected readonly noteLinkDialogVisible = signal(false);
  protected readonly noteLinkTarget = signal('');

  protected readonly versions = signal<NoteVersion[]>([]);
  protected readonly versionsLoaded = signal(false);

  private titleChanges = new Subject<string>();
  private contentChanges = new Subject<string>();
  private destroyed = false;

  ngOnInit(): void {
    this.foldersApi.list().subscribe((folders) => this.allFolders.set(this.flatten(folders)));
    this.tagsApi.list().subscribe((tags) => this.allTags.set(tags));

    this.titleChanges.pipe(debounceTime(800)).subscribe((title) => this.saveField({ title }));
    this.contentChanges.pipe(debounceTime(1200)).subscribe((content) => this.saveField({ content }));

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  private flatten(folders: Folder[]): Folder[] {
    return folders.flatMap((f) => [f, ...this.flatten(f.children)]);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.notesApi.get(id).subscribe({
      next: (note) => {
        this.note.set(note);
        this.loading.set(false);
        this.versionsLoaded.set(false);
        queueMicrotask(() => {
          if (this.contentArea) {
            this.contentArea.nativeElement.innerHTML = note.content ?? '';
          }
        });
      },
      error: () => this.loading.set(false),
    });
  }

  onTitleInput(value: string): void {
    this.note.update((n) => (n ? { ...n, title: value } : n));
    this.titleChanges.next(value);
  }

  onContentInput(): void {
    const html = this.contentArea?.nativeElement.innerHTML ?? '';
    this.contentChanges.next(html);
  }

  private saveField(patch: { title?: string; content?: string }): void {
    const current = this.note();
    if (!current || this.destroyed) return;

    this.saving.set(true);
    this.notesApi.update(current.id, patch).subscribe({
      next: (updated) => {
        this.note.set(updated);
        this.saving.set(false);
        this.lastSavedAt.set(new Date());
      },
      error: () => this.saving.set(false),
    });
  }

  exec(command: string, value?: string): void {
    document.execCommand(command, false, value);
    this.contentArea?.nativeElement.focus();
    this.onContentInput();
  }

  execBlock(tag: string): void {
    this.exec('formatBlock', `<${tag}>`);
  }

  insertLink(): void {
    const url = window.prompt('Link URL');
    if (url) {
      this.exec('createLink', url);
    }
  }

  changeNoteType(value: NoteType): void {
    const current = this.note();
    if (!current) return;
    this.notesApi.update(current.id, { noteType: value }).subscribe((updated) => this.note.set(updated));
  }

  togglePinned(): void {
    const current = this.note();
    if (!current) return;
    this.notesApi.update(current.id, { isPinned: !current.isPinned }).subscribe((updated) => this.note.set(updated));
  }

  toggleFavorite(): void {
    const current = this.note();
    if (!current) return;
    this.notesApi.update(current.id, { isFavorite: !current.isFavorite }).subscribe((updated) => this.note.set(updated));
  }

  toggleArchive(): void {
    const current = this.note();
    if (!current) return;
    this.notesApi.update(current.id, { isArchived: !current.isArchived }).subscribe((updated) => this.note.set(updated));
  }

  duplicate(): void {
    const current = this.note();
    if (!current) return;
    this.notesApi.duplicate(current.id).subscribe((copy) => this.router.navigate(['/notes', copy.id]));
  }

  deleteNote(): void {
    const current = this.note();
    if (!current) return;
    this.notesApi.delete(current.id).subscribe(() => this.router.navigate(['/notes']));
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  moreMenuItems(): MenuItem[] {
    const current = this.note();
    return [
      { label: current?.isArchived ? 'Unarchive' : 'Archive', icon: 'pi pi-inbox', command: () => this.toggleArchive() },
      { label: 'Duplicate', icon: 'pi pi-copy', command: () => this.duplicate() },
      { separator: true },
      { label: 'Export Markdown', icon: 'pi pi-file-export', command: () => this.exportNote('markdown') },
      { label: 'Export HTML', icon: 'pi pi-file-export', command: () => this.exportNote('html') },
      { label: 'Export PDF', icon: 'pi pi-file-pdf', command: () => this.exportNote('pdf') },
      { separator: true },
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'text-destructive', command: () => this.deleteNote() },
    ];
  }

  exportNote(format: 'markdown' | 'html' | 'pdf'): void {
    const current = this.note();
    if (!current) return;
    window.open(this.notesApi.exportUrl(current.id, format), '_blank');
  }

  // Tags
  addTagByName(name: string): void {
    const current = this.note();
    const trimmed = name.trim();
    if (!current || !trimmed) return;

    const existing = this.allTags().find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      this.notesApi.addTag(current.id, existing.id).subscribe((updated) => {
        this.note.set(updated);
        this.tagInput.set('');
      });
      return;
    }

    this.tagsApi.create(trimmed).subscribe((tag) => {
      this.allTags.update((tags) => [...tags, tag]);
      this.notesApi.addTag(current.id, tag.id).subscribe((updated) => {
        this.note.set(updated);
        this.tagInput.set('');
      });
    });
  }

  removeTag(tagId: string): void {
    const current = this.note();
    if (!current) return;
    this.notesApi.removeTag(current.id, tagId).subscribe((updated) => this.note.set(updated));
  }

  // Folder
  assignFolder(folderId: string): void {
    const current = this.note();
    if (!current || !folderId) return;
    this.notesApi.assignFolder(current.id, folderId).subscribe(() => this.load(current.id));
  }

  removeFolder(folderId: string): void {
    const current = this.note();
    if (!current) return;
    this.notesApi.removeFolder(current.id, folderId).subscribe(() => this.load(current.id));
  }

  folderName(id: string): string {
    return this.allFolders().find((f) => f.id === id)?.name ?? id;
  }

  // Module links
  openModuleLinkDialog(): void {
    this.moduleLinkType.set('PROJECT');
    this.moduleLinkId.set('');
    this.moduleLinkDialogVisible.set(true);
  }

  saveModuleLink(): void {
    const current = this.note();
    const id = this.moduleLinkId().trim();
    if (!current || !id) return;

    this.notesApi.addModuleLink(current.id, this.moduleLinkType(), id).subscribe(() => {
      this.moduleLinkDialogVisible.set(false);
      this.load(current.id);
    });
  }

  removeModuleLink(linkId: string): void {
    const current = this.note();
    if (!current) return;
    this.notesApi.removeModuleLink(current.id, linkId).subscribe(() => this.load(current.id));
  }

  // Note links (backlinks/outgoing)
  openNoteLinkDialog(): void {
    this.noteLinkTarget.set('');
    this.noteLinkDialogVisible.set(true);
  }

  saveNoteLink(): void {
    const current = this.note();
    const targetId = this.noteLinkTarget().trim();
    if (!current || !targetId) return;

    this.notesApi.addLink(current.id, targetId).subscribe(() => {
      this.noteLinkDialogVisible.set(false);
      this.load(current.id);
    });
  }

  removeOutgoingLink(targetId: string): void {
    const current = this.note();
    if (!current) return;
    this.notesApi.removeLink(current.id, targetId).subscribe(() => this.load(current.id));
  }

  goToNote(id: string): void {
    this.router.navigate(['/notes', id]);
  }

  // Attachments
  onFileSelected(event: Event): void {
    const current = this.note();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!current || !file) return;

    this.notesApi.uploadAttachment(current.id, file).subscribe(() => {
      this.load(current.id);
      input.value = '';
    });
  }

  downloadAttachment(attachmentId: string): void {
    const current = this.note();
    if (!current) return;
    window.open(this.notesApi.downloadAttachmentUrl(current.id, attachmentId), '_blank');
  }

  deleteAttachment(attachmentId: string): void {
    const current = this.note();
    if (!current) return;
    this.notesApi.deleteAttachment(current.id, attachmentId).subscribe(() => this.load(current.id));
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Versions
  loadVersions(): void {
    const current = this.note();
    if (!current || this.versionsLoaded()) return;

    this.notesApi.getVersions(current.id).subscribe((versions) => {
      this.versions.set(versions);
      this.versionsLoaded.set(true);
    });
  }

  restoreVersion(versionNumber: number): void {
    const current = this.note();
    if (!current) return;
    if (!window.confirm(`Restore version ${versionNumber}? This becomes the new current version.`)) return;

    this.notesApi.restoreVersion(current.id, versionNumber).subscribe((updated) => {
      this.note.set(updated);
      this.versionsLoaded.set(false);
      queueMicrotask(() => {
        if (this.contentArea) {
          this.contentArea.nativeElement.innerHTML = updated.content ?? '';
        }
      });
    });
  }
}
