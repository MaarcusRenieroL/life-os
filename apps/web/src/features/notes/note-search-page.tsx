import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';

import { noteSearchApi } from './search-api';

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function highlight(excerpt: string, rawQuery: string): string {
  const term = rawQuery.replace(/\b(tag|folder|before|after|is):\S+/gi, '').trim();
  if (!term) return escapeHtml(excerpt);
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(${escapedTerm})`, 'ig');
  return escapeHtml(excerpt).replace(pattern, '<mark>$1</mark>');
}

export function NoteSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [committedQuery, setCommittedQuery] = useState(searchParams.get('q') ?? '');

  const debouncedCommit = useDebouncedCallback((value: string) => {
    setCommittedQuery(value);
    setSearchParams(value ? { q: value } : {}, { replace: true });
  }, 300);

  useEffect(() => {
    debouncedCommit(query);
  }, [query, debouncedCommit]);

  const { data: results } = useQuery({
    queryKey: ['notes', 'search', committedQuery],
    queryFn: () => noteSearchApi.search(committedQuery),
    enabled: committedQuery.trim().length > 0,
  });

  const { data: recent = [] } = useQuery({
    queryKey: ['notes', 'search', 'recent', committedQuery],
    queryFn: noteSearchApi.recent,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Search notes</h1>
      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        className="mt-4"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Operators: tag:name folder:name is:pinned is:favorite before:2026-01-01 after:2026-01-01
      </p>

      {!committedQuery.trim() && recent.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xs font-semibold text-muted-foreground">Recent searches</h2>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {recent.map((r) => (
              <li key={r.query}>
                <button
                  className="rounded-full bg-muted px-2.5 py-1 text-xs hover:bg-muted/70"
                  onClick={() => setQuery(r.query)}
                >
                  {r.query} ({r.resultCount})
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {results && (
        <ul className="mt-4 flex flex-col gap-2">
          {results.content.length === 0 && <EmptyState message="No results." />}
          {results.content.map((r) => (
            <li key={r.id}>
              <Link to={`/notes/${r.id}`} className="block rounded-lg border bg-card p-3 hover:border-primary/40">
                <div className="text-sm font-semibold">{r.title}</div>
                <p
                  className="mt-1 text-xs text-muted-foreground [&_mark]:bg-primary/25 [&_mark]:text-foreground"
                  dangerouslySetInnerHTML={{ __html: highlight(r.excerpt, committedQuery) }}
                />
                <div className="mt-1 flex gap-1">
                  {r.tags.map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-[10px]">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
