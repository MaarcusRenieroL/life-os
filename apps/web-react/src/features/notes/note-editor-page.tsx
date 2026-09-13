import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bold,
  CheckSquare,
  Code,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';
import { downloadViaBlob } from '@/features/notes/utils/file-download';

import { foldersApi } from './folders-api';
import { notesApi } from './notes-api';
import { tagsApi } from './tags-api';
import type { NoteModuleType, NoteType, NoteVersion } from './types';
import { NOTE_MODULE_TYPES } from './types';
import { NOTE_TYPE_LIST } from './utils/note-type-meta';

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);
  const syncedNoteId = useRef<string | null>(null);

  const { data: note } = useQuery({ queryKey: ['notes', id], queryFn: () => notesApi.get(id!), enabled: !!id });
  const { data: folders = [] } = useQuery({ queryKey: ['notes', 'folders'], queryFn: foldersApi.list });
  const { data: allTags = [] } = useQuery({ queryKey: ['notes', 'tags'], queryFn: () => tagsApi.list() });

  const [title, setTitle] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const [versions, setVersions] = useState<NoteVersion[] | null>(null);
  const [moduleLinkDialogOpen, setModuleLinkDialogOpen] = useState(false);
  const [moduleLinkType, setModuleLinkType] = useState<NoteModuleType>('PROJECT');
  const [moduleLinkId, setModuleLinkId] = useState('');
  const [noteLinkDialogOpen, setNoteLinkDialogOpen] = useState(false);
  const [targetNoteId, setTargetNoteId] = useState('');

  useEffect(() => {
    if (note) setTitle(note.title);
  }, [note?.id]);

  useEffect(() => {
    if (note && contentRef.current && syncedNoteId.current !== note.id) {
      contentRef.current.innerHTML = note.content ?? '';
      syncedNoteId.current = note.id;
    }
  }, [note]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notes', id] });

  const saveTitle = useDebouncedCallback((value: string) => {
    if (!id) return;
    void notesApi.update(id, { title: value }).then(invalidate);
  }, 800);

  const saveContent = useDebouncedCallback((value: string) => {
    if (!id) return;
    void notesApi.update(id, { content: value });
  }, 1200);

  function onTitleChange(value: string) {
    setTitle(value);
    saveTitle(value);
  }

  function onContentInput() {
    if (contentRef.current) saveContent(contentRef.current.innerHTML);
  }

  function run(command: string, value?: string) {
    exec(command, value);
    contentRef.current?.focus();
    onContentInput();
  }

  const suggestions = useMemo(() => {
    if (!note) return [];
    const attached = new Set(note.tags.map((t) => t.id));
    const q = tagQuery.trim().toLowerCase();
    return allTags
      .filter((t) => !attached.has(t.id) && (!q || t.name.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [allTags, note, tagQuery]);

  async function addTagByName(name: string) {
    if (!id || !name.trim()) return;
    const existing = allTags.find((t) => t.name.toLowerCase() === name.trim().toLowerCase());
    const tag = existing ?? (await tagsApi.create(name.trim()));
    await notesApi.addTag(id, tag.id);
    setTagQuery('');
    invalidate();
    queryClient.invalidateQueries({ queryKey: ['notes', 'tags'] });
  }

  async function removeTag(tagId: string) {
    if (!id) return;
    await notesApi.removeTag(id, tagId);
    invalidate();
  }

  async function assignFolder(folderId: string) {
    if (!id) return;
    await notesApi.assignFolder(id, folderId);
    invalidate();
  }

  async function removeFolder(folderId: string) {
    if (!id) return;
    await notesApi.removeFolder(id, folderId);
    invalidate();
  }

  async function toggleFlag(patch: { isPinned?: boolean; isFavorite?: boolean; isArchived?: boolean }) {
    if (!id) return;
    await notesApi.update(id, patch);
    invalidate();
  }

  async function duplicateNote() {
    if (!id) return;
    const copy = await notesApi.duplicate(id);
    navigate(`/notes/${copy.id}`);
  }

  async function deleteNote() {
    if (!id || !confirm("Delete this note? You can restore it from Trash later.")) return;
    await notesApi.delete(id);
    navigate('/notes');
  }

  async function loadVersions() {
    if (!id) return;
    setVersions(await notesApi.getVersions(id));
  }

  async function restoreVersion(versionNumber: number) {
    if (!id) return;
    if (!confirm(`Restore version ${versionNumber}? This becomes the new current version (the current content is kept in history).`)) return;
    await notesApi.restoreVersion(id, versionNumber);
    syncedNoteId.current = null;
    invalidate();
    setVersions(null);
  }

  async function exportNote(format: 'markdown' | 'html' | 'pdf') {
    if (!id || !note) return;
    const ext = format === 'markdown' ? 'md' : format;
    await downloadViaBlob(notesApi.exportUrl(id, format), `${note.title}.${ext}`);
  }

  async function onUploadAttachment(file: File) {
    if (!id) return;
    await notesApi.uploadAttachment(id, file);
    invalidate();
  }

  async function deleteAttachment(attachmentId: string) {
    if (!id) return;
    await notesApi.deleteAttachment(id, attachmentId);
    invalidate();
  }

  async function addModuleLink() {
    if (!id || !moduleLinkId.trim()) return;
    await notesApi.addModuleLink(id, moduleLinkType, moduleLinkId.trim());
    setModuleLinkId('');
    setModuleLinkDialogOpen(false);
    invalidate();
  }

  async function addNoteLink() {
    if (!id || !targetNoteId.trim()) return;
    await notesApi.addLink(id, targetNoteId.trim());
    setTargetNoteId('');
    setNoteLinkDialogOpen(false);
    invalidate();
  }

  if (!note) {
    return (
      <div>
        <Link to="/notes" className="text-sm text-muted-foreground hover:underline">
          ← Notes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <Link to="/notes" className="text-sm text-muted-foreground hover:underline">
          ← Notes
        </Link>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => void toggleFlag({ isPinned: !note.isPinned })}>
            {note.isPinned ? 'Unpin' : 'Pin'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void toggleFlag({ isFavorite: !note.isFavorite })}>
            {note.isFavorite ? '★ Favorited' : '☆ Favorite'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void toggleFlag({ isArchived: !note.isArchived })}>
            {note.isArchived ? 'Unarchive' : 'Archive'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void duplicateNote()}>
            Duplicate
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteNote()}>
            Delete
          </Button>
        </div>
      </div>

      <Input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled note"
        className="mt-4 border-none px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Select value={note.noteType} onValueChange={(v) => void notesApi.update(id!, { noteType: v as NoteType }).then(invalidate)}>
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTE_TYPE_LIST.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>{note.wordCount} words</span>
        <span>·</span>
        <span>{note.readingTimeMinutes} min read</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1 rounded-md border bg-card p-1">
        <Button size="icon-sm" variant="ghost" onClick={() => run('bold')}><Bold /></Button>
        <Button size="icon-sm" variant="ghost" onClick={() => run('italic')}><Italic /></Button>
        <Button size="icon-sm" variant="ghost" onClick={() => run('underline')}><Underline /></Button>
        <Button size="icon-sm" variant="ghost" onClick={() => run('strikeThrough')}><Strikethrough /></Button>
        <Button size="sm" variant="ghost" onClick={() => run('formatBlock', '<h1>')}>H1</Button>
        <Button size="sm" variant="ghost" onClick={() => run('formatBlock', '<h2>')}>H2</Button>
        <Button size="sm" variant="ghost" onClick={() => run('formatBlock', '<h3>')}>H3</Button>
        <Button size="icon-sm" variant="ghost" onClick={() => run('insertUnorderedList')}><List /></Button>
        <Button size="icon-sm" variant="ghost" onClick={() => run('insertOrderedList')}><ListOrdered /></Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() =>
            run(
              'insertHTML',
              '<div class="checklist-item"><input type="checkbox" contenteditable="false" /><span> </span></div><div><br></div>',
            )
          }
        >
          <CheckSquare />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => run('formatBlock', '<blockquote>')}><Quote /></Button>
        <Button size="icon-sm" variant="ghost" onClick={() => run('formatBlock', '<pre>')}><Code /></Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            const url = window.prompt('Link URL');
            if (url) run('createLink', url);
          }}
        >
          <LinkIcon />
        </Button>
      </div>

      <div
        ref={contentRef}
        contentEditable
        onInput={onContentInput}
        className="prose prose-sm mt-2 min-h-64 max-w-none rounded-md border bg-background p-4 text-sm focus:outline-none [&_.checklist-item]:flex [&_.checklist-item]:items-center [&_.checklist-item]:gap-2"
      />

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {note.tags.map((t) => (
          <Badge key={t.id} variant="secondary" className="gap-1">
            {t.name}
            <button onClick={() => void removeTag(t.id)} className="text-muted-foreground hover:text-foreground">
              ×
            </button>
          </Badge>
        ))}
        <div className="relative">
          <Input
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addTagByName(tagQuery)}
            placeholder="+ tag"
            className="h-7 w-24 text-xs"
          />
          {tagQuery && suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-40 rounded-md border bg-popover p-1 shadow-md">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                  onClick={() => void addTagByName(s.name)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Folders:</span>
        {note.folderIds.map((fid) => {
          const f = folders.find((x) => x.id === fid);
          return (
            <Badge key={fid} variant="outline" className="gap-1">
              {f?.name ?? fid}
              <button onClick={() => void removeFolder(fid)} className="text-muted-foreground hover:text-foreground">
                ×
              </button>
            </Badge>
          );
        })}
        <Select onValueChange={(v) => void assignFolder(v as string)}>
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue placeholder="+ Add to folder" />
          </SelectTrigger>
          <SelectContent>
            {folders.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Module links</h3>
            <Button size="sm" variant="ghost" onClick={() => setModuleLinkDialogOpen(true)}>+ Link</Button>
          </div>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {note.moduleLinks.map((l) => (
              <li key={l.id} className="flex items-center justify-between">
                <span>{l.moduleType}: {l.moduleId}</span>
                <button className="hover:text-destructive" onClick={() => void notesApi.removeModuleLink(id!, l.id).then(invalidate)}>Remove</button>
              </li>
            ))}
            {note.moduleLinks.length === 0 && <li>None yet.</li>}
          </ul>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Note links</h3>
            <Button size="sm" variant="ghost" onClick={() => setNoteLinkDialogOpen(true)}>+ Link</Button>
          </div>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {note.outgoingLinks.map((l) => (
              <li key={l.id}>
                <Link to={`/notes/${l.id}`} className="hover:underline">{l.title}</Link>
              </li>
            ))}
            {note.outgoingLinks.length === 0 && <li>None yet.</li>}
          </ul>
          {note.backlinks.length > 0 && (
            <>
              <h4 className="mt-2 text-xs font-medium text-muted-foreground">Backlinks</h4>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {note.backlinks.map((l) => (
                  <li key={l.id}>
                    <Link to={`/notes/${l.id}`} className="hover:underline">{l.title}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Attachments</h3>
            <label className="cursor-pointer text-xs text-primary hover:underline">
              + Upload
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUploadAttachment(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {note.attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <button
                  className="hover:underline"
                  onClick={() => void downloadViaBlob(notesApi.downloadAttachmentUrl(id!, a.id), a.fileName)}
                >
                  {a.fileName}
                </button>
                <button className="hover:text-destructive" onClick={() => void deleteAttachment(a.id)}>Remove</button>
              </li>
            ))}
            {note.attachments.length === 0 && <li>None yet.</li>}
          </ul>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Versions</h3>
            <Button size="sm" variant="ghost" onClick={() => void loadVersions()}>
              {versions ? 'Refresh' : 'Load history'}
            </Button>
          </div>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {(versions ?? []).map((v) => (
              <li key={v.id} className="flex items-center justify-between">
                <span>v{v.versionNumber} · {new Date(v.createdAt).toLocaleString()}</span>
                <button className="hover:underline" onClick={() => void restoreVersion(v.versionNumber)}>Restore</button>
              </li>
            ))}
            {versions && versions.length === 0 && <li>No earlier versions.</li>}
          </ul>
        </section>
      </div>

      <div className="mt-6 flex items-center gap-2 border-t pt-4 text-xs">
        <span className="text-muted-foreground">Export:</span>
        <button className="text-primary hover:underline" onClick={() => void exportNote('markdown')}>Markdown</button>
        <button className="text-primary hover:underline" onClick={() => void exportNote('html')}>HTML</button>
        <button className="text-primary hover:underline" onClick={() => void exportNote('pdf')}>PDF</button>
      </div>

      <Dialog open={moduleLinkDialogOpen} onOpenChange={setModuleLinkDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link a module item</DialogTitle></DialogHeader>
          <Select value={moduleLinkType} onValueChange={(v) => setModuleLinkType(v as NoteModuleType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {NOTE_MODULE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={moduleLinkId} onChange={(e) => setModuleLinkId(e.target.value)} placeholder="Module item ID" />
          <DialogFooter>
            <Button onClick={() => void addModuleLink()}>Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteLinkDialogOpen} onOpenChange={setNoteLinkDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link another note</DialogTitle></DialogHeader>
          <Input value={targetNoteId} onChange={(e) => setTargetNoteId(e.target.value)} placeholder="Target note ID" />
          <DialogFooter>
            <Button onClick={() => void addNoteLink()}>Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
