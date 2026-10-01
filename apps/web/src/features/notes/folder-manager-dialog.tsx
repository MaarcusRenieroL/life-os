import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { foldersApi } from './folders-api';
import type { Folder } from './types';

interface FlatFolder extends Folder {
  depth: number;
}

function flatten(folders: Folder[], depth = 0): FlatFolder[] {
  return folders.flatMap((f) => [{ ...f, depth }, ...flatten(f.children, depth + 1)]);
}

export function FolderManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: folders = [] } = useQuery({ queryKey: ['notes', 'folders'], queryFn: foldersApi.list, staleTime: 5 * 60_000 });
  const flat = flatten(folders);

  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const { confirm, dialog } = useConfirmDialog();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['notes', 'folders'] });
  }

  async function createFolder() {
    if (!newName.trim()) return;
    await foldersApi.create(newName.trim(), null);
    setNewName('');
    invalidate();
  }

  function startRename(folder: FlatFolder) {
    setRenamingId(folder.id);
    setRenameValue(folder.name);
  }

  async function commitRename(id: string) {
    if (renameValue.trim()) {
      await foldersApi.rename(id, renameValue.trim());
      invalidate();
    }
    setRenamingId(null);
  }

  async function deleteFolder(folder: FlatFolder) {
    const message =
      folder.noteCount > 0
        ? `"${folder.name}" has ${folder.noteCount} note(s) in it. Delete the folder and everything in it?`
        : `Delete "${folder.name}"?`;
    const ok = await confirm({ title: message, confirmLabel: 'Delete' });
    if (!ok) return;
    await foldersApi.delete(folder.id, true);
    invalidate();
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Manage folders</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void createFolder()}
            placeholder="New folder name"
          />
          <Button onClick={() => void createFolder()} disabled={!newName.trim()}>Add</Button>
        </div>
        <ul className="mt-2 flex max-h-72 flex-col gap-1 overflow-auto">
          {flat.map((folder) => (
            <li
              key={folder.id}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
              style={{ paddingLeft: `${folder.depth * 16 + 8}px` }}
            >
              {renamingId === folder.id ? (
                <Input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => void commitRename(folder.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitRename(folder.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="h-7"
                />
              ) : (
                <button className="flex-1 text-left text-sm" onClick={() => startRename(folder)}>
                  {folder.name} <span className="text-xs text-muted-foreground">({folder.noteCount})</span>
                </button>
              )}
              <button className="text-xs text-destructive hover:underline" onClick={() => void deleteFolder(folder)}>
                Delete
              </button>
            </li>
          ))}
          {flat.length === 0 && <EmptyState className="p-2" message="No folders yet." />}
        </ul>
      </DialogContent>
    </Dialog>
    {dialog}
    </>
  );
}
