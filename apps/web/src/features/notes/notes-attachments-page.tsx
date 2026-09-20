import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { notesApi } from './notes-api';
import type { GlobalAttachment } from './types';
import { downloadViaBlob } from './utils/file-download';
import { fileIconFor, fileKind, formatFileSize, type FileKind } from './utils/file-type';

type SortOption = 'newest' | 'oldest' | 'largest';

export function NotesAttachmentsPage() {
  const queryClient = useQueryClient();
  const { data: attachments = [] } = useQuery({
    queryKey: ['notes', 'attachments'],
    queryFn: notesApi.allAttachments,
  });

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FileKind | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [selected, setSelected] = useState<GlobalAttachment | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const filtered = useMemo(() => {
    let list = attachments.filter((a) => a.fileName.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== 'all') {
      list = list.filter((a) => fileKind(a.fileName) === typeFilter);
    }
    list = [...list].sort((a, b) => {
      if (sort === 'largest') return b.fileSize - a.fileSize;
      const diff = new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      return sort === 'newest' ? diff : -diff;
    });
    return list;
  }, [attachments, search, typeFilter, sort]);

  async function deleteAttachment(attachment: GlobalAttachment) {
    const ok = await confirm({ title: `Delete "${attachment.fileName}"? This can't be undone.`, confirmLabel: 'Delete' });
    if (!ok) return;
    await notesApi.deleteAttachment(attachment.noteId, attachment.id);
    if (selected?.id === attachment.id) setSelected(null);
    queryClient.invalidateQueries({ queryKey: ['notes', 'attachments'] });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Attachments</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search filename…" className="max-w-xs" />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FileKind | 'all')}>
          <SelectTrigger className="min-w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="pdf">PDFs</SelectItem>
            <SelectItem value="doc">Documents</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="min-w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="largest">Largest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_300px]">
        <ul className="flex flex-col gap-1.5">
          {filtered.map((a) => {
            const Icon = fileIconFor(a.fileName);
            return (
              <li key={a.id}>
                <button
                  onClick={() => setSelected(a)}
                  className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2 text-left hover:border-primary/40"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{a.fileName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatFileSize(a.fileSize)} · <Link to={`/notes/${a.noteId}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>{a.noteTitle}</Link>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <EmptyState message="No attachments found." />}
        </ul>

        {selected && (
          <div className="rounded-lg border bg-card p-4">
            {fileKind(selected.fileName) === 'image' ? (
              // Matches the Angular app's existing behavior: a raw <img src> to the API
              // route bypasses the JWT-attaching client, same latent gap as the original.
              <img src={downloadUrl(selected)} alt={selected.fileName} className="w-full rounded-md" />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                No preview
              </div>
            )}
            <div className="mt-3 text-sm font-semibold">{selected.fileName}</div>
            <div className="mt-1 text-xs text-muted-foreground">{formatFileSize(selected.fileSize)}</div>
            <div className="mt-3 flex gap-2 text-xs">
              <button
                className="text-primary hover:underline"
                onClick={() => void downloadViaBlob(notesApi.downloadAttachmentUrl(selected.noteId, selected.id), selected.fileName)}
              >
                Download
              </button>
              <button className="text-destructive hover:underline" onClick={() => void deleteAttachment(selected)}>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
      {dialog}
    </div>
  );
}

function downloadUrl(attachment: GlobalAttachment): string {
  return notesApi.downloadAttachmentUrl(attachment.noteId, attachment.id);
}
