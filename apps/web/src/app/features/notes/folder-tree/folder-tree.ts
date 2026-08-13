import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Folder } from '../../../core/models/notes.model';

@Component({
  selector: 'app-folder-tree',
  standalone: true,
  // Self-imported so the template can recurse into <app-folder-tree> for
  // child folders - valid because the decorator runs after the class body
  // is bound, so `FolderTree` already resolves by the time this array reads.
  imports: [FolderTree],
  templateUrl: './folder-tree.html',
})
export class FolderTree {
  @Input() folders: Folder[] = [];
  @Input() selectedFolderId: string | null = null;
  @Input() depth = 0;

  @Output() folderSelect = new EventEmitter<string>();
  @Output() rename = new EventEmitter<Folder>();
  @Output() remove = new EventEmitter<Folder>();
  @Output() addChild = new EventEmitter<Folder>();
  @Output() dropNote = new EventEmitter<{ folderId: string; noteId: string }>();

  expanded = new Set<string>();

  toggle(id: string): void {
    if (this.expanded.has(id)) {
      this.expanded.delete(id);
    } else {
      this.expanded.add(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.expanded.has(id);
  }

  onDrop(event: DragEvent, folderId: string): void {
    event.preventDefault();
    const noteId = event.dataTransfer?.getData('text/note-id');
    if (noteId) {
      this.dropNote.emit({ folderId, noteId });
    }
  }
}
