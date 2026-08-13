import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { concatMap, from, toArray } from 'rxjs';

import { NoteFoldersApiService } from '../../../core/services/note-folders-api.service';
import { NoteTagsApiService } from '../../../core/services/note-tags-api.service';
import { NotesApiService } from '../../../core/services/notes-api.service';
import { Folder, NoteSummary, Tag } from '../../../core/models/notes.model';
import { FolderTree } from '../folder-tree/folder-tree';
import { noteTypeMeta } from '../shared/note-type.util';

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, ButtonModule, DialogModule, MenuModule, SelectModule, FolderTree],
  templateUrl: './notes-list.html',
  styleUrl: './notes-list.scss',
})
export class NotesList implements OnInit {
  private readonly notesApi = inject(NotesApiService);
  private readonly foldersApi = inject(NoteFoldersApiService);
  private readonly tagsApi = inject(NoteTagsApiService);
  private readonly router = inject(Router);

  protected readonly notes = signal<NoteSummary[]>([]);
  protected readonly folders = signal<Folder[]>([]);
  protected readonly tags = signal<Tag[]>([]);
  protected readonly loading = signal(true);
  protected readonly totalElements = signal(0);
  protected readonly page = signal(0);
  protected readonly pageSize = 24;

  protected readonly selectedFolderId = signal<string | null>(null);
  protected readonly selectedTagId = signal<string | null>(null);
  protected readonly quickView = signal<'all' | 'favorites' | 'pinned' | 'archived'>('all');
  protected readonly searchTerm = signal('');
  protected readonly sort = signal<'title' | 'created' | 'modified'>('modified');
  protected readonly order = signal<'asc' | 'desc'>('desc');

  protected readonly selected = signal<Set<string>>(new Set());

  protected readonly folderDialogVisible = signal(false);
  protected readonly folderDialogParent = signal<Folder | null>(null);
  protected readonly folderDialogRenaming = signal<Folder | null>(null);
  protected readonly folderNameDraft = signal('');

  protected readonly sortOptions = [
    { label: 'Last modified', value: 'modified' },
    { label: 'Date created', value: 'created' },
    { label: 'Title', value: 'title' },
  ];

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalElements() / this.pageSize)));

  protected readonly folderCount = computed(() => this.flatten(this.folders()).length);
  protected readonly favoriteCount = signal(0);
  protected readonly pinnedCount = signal(0);

  protected readonly typeMeta = noteTypeMeta;

  ngOnInit(): void {
    this.loadFolders();
    this.loadTags();
    this.loadNotes();
  }

  private loadStatCounts(): void {
    this.notesApi.favorites().subscribe((notes) => this.favoriteCount.set(notes.length));
    this.notesApi.pinned().subscribe((notes) => this.pinnedCount.set(notes.length));
  }

  private loadFolders(): void {
    this.foldersApi.list().subscribe((folders) => this.folders.set(folders));
  }

  private loadTags(): void {
    this.tagsApi.list().subscribe((tags) => this.tags.set(tags));
  }

  loadNotes(): void {
    this.loading.set(true);
    this.loadStatCounts();

    if (this.quickView() === 'favorites') {
      this.notesApi.favorites().subscribe((notes) => this.finishLoad(notes));
      return;
    }

    if (this.quickView() === 'pinned') {
      this.notesApi.pinned().subscribe((notes) => this.finishLoad(notes));
      return;
    }

    this.notesApi
      .list({
        sort: this.sort(),
        order: this.order(),
        folder: this.selectedFolderId() ?? undefined,
        tag: this.selectedTagId() ?? undefined,
        archived: this.quickView() === 'archived',
        page: this.page(),
        size: this.pageSize,
      })
      .subscribe({
        next: (response) => {
          this.notes.set(response.content);
          this.totalElements.set(response.totalElements);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private finishLoad(notes: NoteSummary[]): void {
    this.notes.set(notes);
    this.totalElements.set(notes.length);
    this.loading.set(false);
  }

  protected readonly filteredNotes = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) return this.notes();

    return this.notes().filter(
      (note) =>
        note.title.toLowerCase().includes(query) || (note.description ?? '').toLowerCase().includes(query),
    );
  });

  setQuickView(view: 'all' | 'favorites' | 'pinned' | 'archived'): void {
    this.quickView.set(view);
    this.selectedFolderId.set(null);
    this.selectedTagId.set(null);
    this.page.set(0);
    this.loadNotes();
  }

  selectFolder(folderId: string): void {
    this.quickView.set('all');
    this.selectedFolderId.set(this.selectedFolderId() === folderId ? null : folderId);
    this.page.set(0);
    this.loadNotes();
  }

  selectTag(tagId: string): void {
    this.quickView.set('all');
    this.selectedTagId.set(this.selectedTagId() === tagId ? null : tagId);
    this.page.set(0);
    this.loadNotes();
  }

  onSortChange(): void {
    this.page.set(0);
    this.loadNotes();
  }

  toggleOrder(): void {
    this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    this.loadNotes();
  }

  nextPage(): void {
    if (this.page() + 1 < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.loadNotes();
    }
  }

  prevPage(): void {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
      this.loadNotes();
    }
  }

  createNote(): void {
    this.notesApi
      .create({ title: 'Untitled note', folderId: this.selectedFolderId() ?? undefined })
      .subscribe((note) => this.router.navigate(['/notes', note.id]));
  }

  openNote(id: string): void {
    this.router.navigate(['/notes', id]);
  }

  onDragStart(event: DragEvent, noteId: string): void {
    event.dataTransfer?.setData('text/note-id', noteId);
  }

  onDropOnFolder(payload: { folderId: string; noteId: string }): void {
    this.notesApi.assignFolder(payload.noteId, payload.folderId).subscribe(() => this.loadNotes());
  }

  togglePin(note: NoteSummary, event: Event): void {
    event.stopPropagation();
    this.notesApi.update(note.id, { isPinned: !note.isPinned }).subscribe(() => this.loadNotes());
  }

  toggleFavorite(note: NoteSummary, event: Event): void {
    event.stopPropagation();
    this.notesApi.update(note.id, { isFavorite: !note.isFavorite }).subscribe(() => this.loadNotes());
  }

  toggleArchive(note: NoteSummary, event: Event): void {
    event.stopPropagation();
    this.notesApi.update(note.id, { isArchived: !note.isArchived }).subscribe(() => this.loadNotes());
  }

  deleteNote(note: NoteSummary, event: Event): void {
    event.stopPropagation();
    this.notesApi.delete(note.id).subscribe(() => this.loadNotes());
  }

  rowMenuItems(note: NoteSummary): MenuItem[] {
    return [
      { label: note.isPinned ? 'Unpin' : 'Pin', icon: 'pi pi-thumbtack', command: () => this.togglePin(note, new Event('click')) },
      {
        label: note.isFavorite ? 'Unfavorite' : 'Favorite',
        icon: 'pi pi-star',
        command: () => this.toggleFavorite(note, new Event('click')),
      },
      {
        label: note.isArchived ? 'Unarchive' : 'Archive',
        icon: 'pi pi-inbox',
        command: () => this.toggleArchive(note, new Event('click')),
      },
      { label: 'Duplicate', icon: 'pi pi-copy', command: () => this.notesApi.duplicate(note.id).subscribe(() => this.loadNotes()) },
      { separator: true },
      { label: 'Delete', icon: 'pi pi-trash', styleClass: 'text-destructive', command: () => this.deleteNote(note, new Event('click')) },
    ];
  }

  toggleSelect(id: string, event: Event): void {
    event.stopPropagation();
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  bulkDelete(): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;

    from(ids)
      .pipe(concatMap((id) => this.notesApi.delete(id)), toArray())
      .subscribe(() => {
        this.clearSelection();
        this.loadNotes();
      });
  }

  bulkArchive(): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;

    from(ids)
      .pipe(concatMap((id) => this.notesApi.update(id, { isArchived: true })), toArray())
      .subscribe(() => {
        this.clearSelection();
        this.loadNotes();
      });
  }

  bulkMoveToFolder(folderId: string): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;

    from(ids)
      .pipe(concatMap((id) => this.notesApi.assignFolder(id, folderId)), toArray())
      .subscribe(() => {
        this.clearSelection();
        this.loadNotes();
      });
  }

  bulkFolderMenuItems(): MenuItem[] {
    if (this.folders().length === 0) {
      return [{ label: 'No folders yet', disabled: true }];
    }

    const flatten = (folders: Folder[]): MenuItem[] =>
      folders.flatMap((f) => [
        { label: f.name, command: () => this.bulkMoveToFolder(f.id) },
        ...flatten(f.children),
      ]);

    return flatten(this.folders());
  }

  openCreateFolder(parent: Folder | null): void {
    this.folderDialogParent.set(parent);
    this.folderDialogRenaming.set(null);
    this.folderNameDraft.set('');
    this.folderDialogVisible.set(true);
  }

  openRenameFolder(folder: Folder): void {
    this.folderDialogRenaming.set(folder);
    this.folderDialogParent.set(null);
    this.folderNameDraft.set(folder.name);
    this.folderDialogVisible.set(true);
  }

  saveFolderDialog(): void {
    const name = this.folderNameDraft().trim();
    if (!name) return;

    const renaming = this.folderDialogRenaming();
    if (renaming) {
      this.foldersApi.rename(renaming.id, name).subscribe(() => {
        this.folderDialogVisible.set(false);
        this.loadFolders();
      });
      return;
    }

    this.foldersApi.create(name, this.folderDialogParent()?.id ?? null).subscribe(() => {
      this.folderDialogVisible.set(false);
      this.loadFolders();
    });
  }

  deleteFolder(folder: Folder): void {
    this.foldersApi.delete(folder.id, true).subscribe(() => {
      if (this.selectedFolderId() === folder.id) {
        this.selectedFolderId.set(null);
        this.loadNotes();
      }
      this.loadFolders();
    });
  }

  excerpt(note: NoteSummary): string {
    return note.description ?? '';
  }

  private flatten(folders: Folder[]): Folder[] {
    return folders.flatMap((f) => [f, ...this.flatten(f.children)]);
  }
}
