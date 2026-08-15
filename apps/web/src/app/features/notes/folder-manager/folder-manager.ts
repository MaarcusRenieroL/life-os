import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { NoteFoldersApiService } from '../../../core/services/note-folders-api.service';
import { Folder } from '../../../core/models/notes.model';

interface FlatFolder {
  folder: Folder;
  depth: number;
}

@Component({
  selector: 'app-folder-manager',
  standalone: true,
  imports: [FormsModule, ButtonModule, ConfirmDialogModule, DialogModule, InputTextModule],
  providers: [ConfirmationService],
  templateUrl: './folder-manager.html',
  styleUrl: './folder-manager.scss',
})
export class FolderManager {
  private readonly foldersApi = inject(NoteFoldersApiService);
  private readonly confirmationService = inject(ConfirmationService);

  // A computed() only re-runs when a signal it read changes - a plain
  // `@Input() folders: Folder[]` field is just a property Angular overwrites
  // on each change-detection pass, so flatFolders() below would memoize
  // against the very first (usually empty) value forever and never update
  // as the parent's folder list loads or changes. Routing the input through
  // a signal is what makes it reactive.
  private readonly _folders = signal<Folder[]>([]);
  @Input() set folders(value: Folder[]) {
    this._folders.set(value);
  }
  get folders(): Folder[] {
    return this._folders();
  }

  private readonly _visible = signal(false);
  @Input() set visible(value: boolean) {
    this._visible.set(value);
  }
  get visible(): boolean {
    return this._visible();
  }

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();

  protected readonly renamingId = signal<string | null>(null);
  protected readonly renameDraft = signal('');
  protected readonly newFolderName = signal('');

  protected readonly flatFolders = computed<FlatFolder[]>(() => this.flatten(this._folders(), 0));

  private flatten(folders: Folder[], depth: number): FlatFolder[] {
    return folders.flatMap((folder) => [{ folder, depth }, ...this.flatten(folder.children, depth + 1)]);
  }

  startRename(folder: Folder, event: Event): void {
    event.stopPropagation();
    this.renamingId.set(folder.id);
    this.renameDraft.set(folder.name);
  }

  cancelRename(): void {
    this.renamingId.set(null);
  }

  confirmRename(folder: Folder): void {
    const name = this.renameDraft().trim();
    if (!name || name === folder.name) {
      this.renamingId.set(null);
      return;
    }

    this.foldersApi.rename(folder.id, name).subscribe(() => {
      this.renamingId.set(null);
      this.refresh();
    });
  }

  createFolder(): void {
    const name = this.newFolderName().trim();
    if (!name) return;

    this.foldersApi.create(name, null).subscribe(() => {
      this.newFolderName.set('');
      this.refresh();
    });
  }

  deleteFolder(folder: Folder, event: Event): void {
    event.stopPropagation();
    this.confirmationService.confirm({
      header: 'Delete folder',
      message:
        folder.noteCount > 0
          ? `"${folder.name}" has ${folder.noteCount} note${folder.noteCount === 1 ? '' : 's'} in it. Delete the folder and everything in it?`
          : `Delete "${folder.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: 'Delete' },
      rejectButtonProps: { severity: 'secondary', text: true, label: 'Cancel' },
      accept: () => {
        this.foldersApi.delete(folder.id, true).subscribe(() => this.refresh());
      },
    });
  }

  private refresh(): void {
    this.foldersApi.list().subscribe((folders) => (this.folders = folders));
  }

  done(): void {
    this.onVisibleChange(false);
  }

  onVisibleChange(value: boolean): void {
    this._visible.set(value);
    this.visibleChange.emit(value);
    if (!value) {
      this.closed.emit();
    }
  }
}
