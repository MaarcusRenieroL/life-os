import { DatePipe, SlicePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { FileUploadHandlerEvent, FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { Subject, debounceTime } from 'rxjs';

import { RelativeTimePipe } from '../shared/relative-time.pipe';
import { NoteFoldersApiService } from '../../../core/services/note-folders-api.service';
import { NoteTagsApiService } from '../../../core/services/note-tags-api.service';
import { NotesApiService } from '../../../core/services/notes-api.service';
import { Folder, Note, NoteModuleType, NoteType, NoteVersion, Tag } from '../../../core/models/notes.model';
import { NOTE_TYPE_LIST, noteTypeMeta } from '../shared/note-type.util';

const MODULE_TYPES: NoteModuleType[] = ['PROJECT', 'GOAL', 'TASK', 'JOB_APPLICATION', 'HABIT'];

@Component({
  selector: 'app-note-editor-page',
  standalone: true,
  imports: [
    DatePipe,
    SlicePipe,
    FormsModule,
    RouterLink,
    AutoCompleteModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    FileUploadModule,
    InputTextModule,
    MenuModule,
    SelectModule,
    TagModule,
    RelativeTimePipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.scss',
})
export class NoteEditorPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notesApi = inject(NotesApiService);
  private readonly foldersApi = inject(NoteFoldersApiService);
  private readonly tagsApi = inject(NoteTagsApiService);
  private readonly confirmationService = inject(ConfirmationService);

  // Signal-based viewChild instead of @ViewChild: the content div only
  // exists once `note()` is non-null (it's behind an @if), so a decorator
  // query captured at ngAfterViewInit can be stale/undefined the first time
  // a note loads. Reading it as a signal and reacting via effect() below
  // means the sync always runs once both the note data AND the element are
  // actually there, regardless of which one resolves first.
  private readonly contentAreaRef = viewChild<ElementRef<HTMLDivElement>>('contentArea');
  private syncedNoteId: string | null = null;

  protected readonly noteTypes = NOTE_TYPE_LIST;
  protected readonly moduleTypes = MODULE_TYPES;

  protected readonly note = signal<Note | null>(null);
  protected readonly loading = signal(true);
  protected readonly sidebarOpen = signal(true);
  protected readonly lastSavedAt = signal<Date | null>(null);
  protected readonly saving = signal(false);

  protected readonly allFolders = signal<Folder[]>([]);
  protected readonly allTags = signal<Tag[]>([]);
  protected readonly tagInput = signal('');
  protected readonly tagSuggestions = signal<Tag[]>([]);
  protected readonly addingTag = signal(false);

  protected readonly folderPath = computed(() => {
    const n = this.note();
    if (!n || n.folderIds.length === 0) return 'Unfiled';
    return n.folderIds.map((id) => this.folderName(id)).join(', ');
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

  constructor() {
    // Fires whenever the note data or the contenteditable element changes -
    // exactly the two things that need to both be present before the HTML
    // can be poured in. Guarded by syncedNoteId so it only overwrites the
    // div on an actual note switch/restore, never on every keystroke (the
    // note signal also updates on each debounced autosave).
    effect(() => {
      const note = this.note();
      const element = this.contentAreaRef()?.nativeElement;

      if (note && element && this.syncedNoteId !== note.id) {
        element.innerHTML = note.content ?? '';
        this.syncedNoteId = note.id;
      }
    });
  }

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
      },
      error: () => this.loading.set(false),
    });
  }

  onTitleInput(value: string): void {
    this.note.update((n) => (n ? { ...n, title: value } : n));
    this.titleChanges.next(value);
  }

  onContentInput(): void {
    const html = this.contentAreaRef()?.nativeElement.innerHTML ?? '';
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
    this.contentAreaRef()?.nativeElement.focus();
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

  insertChecklistItem(): void {
    // A real, focusable checkbox rather than a styled div - matches the
    // handoff's accessibility note that checklist items must be actual
    // checkboxes, not decorative spans.
    this.exec(
      'insertHTML',
      '<div class="checklist-item"><input type="checkbox" contenteditable="false" /><span> </span></div><div><br></div>',
    );
  }

  typeMeta() {
    return noteTypeMeta(this.note()?.noteType);
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
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'text-destructive', command: () => this.confirmDelete() },
    ];
  }

  exportNote(format: 'markdown' | 'html' | 'pdf'): void {
    const current = this.note();
    if (!current) return;
    window.open(this.notesApi.exportUrl(current.id, format), '_blank');
  }

  // Tags
  searchTagSuggestions(event: AutoCompleteCompleteEvent): void {
    const q = event.query.trim().toLowerCase();
    const existingIds = new Set(this.note()?.tags.map((t) => t.id) ?? []);
    this.tagSuggestions.set(
      this.allTags().filter((t) => t.name.toLowerCase().includes(q) && !existingIds.has(t.id)).slice(0, 8),
    );
  }

  onTagSelected(tag: Tag): void {
    const current = this.note();
    if (!current) return;
    this.notesApi.addTag(current.id, tag.id).subscribe((updated) => {
      this.note.set(updated);
      this.tagInput.set('');
    });
  }

  addTagByName(name: string): void {
    const current = this.note();
    const trimmed = name.trim();
    if (!current || !trimmed) return;

    const existing = this.allTags().find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      this.onTagSelected(existing);
      return;
    }

    this.tagsApi.create(trimmed).subscribe((tag) => {
      this.allTags.update((tags) => [...tags, tag]);
      this.onTagSelected(tag);
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
  onAttachmentUpload(event: FileUploadHandlerEvent, fileUpload: { clear: () => void }): void {
    const current = this.note();
    const file = event.files[0];
    if (!current || !file) return;

    this.notesApi.uploadAttachment(current.id, file).subscribe(() => {
      this.load(current.id);
      fileUpload.clear();
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

    this.confirmationService.confirm({
      header: 'Restore version',
      message: `Restore version ${versionNumber}? This becomes the new current version (the current content is kept in history).`,
      icon: 'pi pi-history',
      acceptButtonProps: { label: 'Restore' },
      rejectButtonProps: { severity: 'secondary', text: true, label: 'Cancel' },
      accept: () => {
        this.notesApi.restoreVersion(current.id, versionNumber).subscribe((updated) => {
          // Same note id, new content - force the sync effect to treat this
          // as a fresh load instead of skipping it as an autosave echo.
          this.syncedNoteId = null;
          this.note.set(updated);
          this.versionsLoaded.set(false);
        });
      },
    });
  }

  confirmDelete(): void {
    this.confirmationService.confirm({
      header: 'Delete note',
      message: 'Delete this note? You can restore it from Trash later.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: 'Delete' },
      rejectButtonProps: { severity: 'secondary', text: true, label: 'Cancel' },
      accept: () => this.deleteNote(),
    });
  }

  exportMenuItems(): MenuItem[] {
    return [
      { label: 'Markdown', icon: 'pi pi-file', command: () => this.exportNote('markdown') },
      { label: 'HTML', icon: 'pi pi-code', command: () => this.exportNote('html') },
      { label: 'PDF', icon: 'pi pi-file-pdf', command: () => this.exportNote('pdf') },
    ];
  }
}
