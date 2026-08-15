import { Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { NoteSearchApiService } from '../../../core/services/note-search-api.service';
import { RecentSearch, SearchResult } from '../../../core/models/notes.model';
import { RelativeTimePipe } from '../shared/relative-time.pipe';

@Component({
  selector: 'app-note-search',
  standalone: true,
  imports: [FormsModule, IconFieldModule, InputIconModule, InputTextModule, TagModule, RelativeTimePipe],
  templateUrl: './note-search.html',
  styleUrl: './note-search.scss',
})
export class NoteSearch implements OnInit {
  private readonly searchApi = inject(NoteSearchApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly query = signal('');
  protected readonly results = signal<SearchResult[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly recentSearches = signal<RecentSearch[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);

  private queryChanges = new Subject<string>();

  ngOnInit(): void {
    this.searchApi.recent().subscribe((recent) => this.recentSearches.set(recent));

    this.queryChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((q) => this.runSearch(q));

    const initial = this.route.snapshot.queryParamMap.get('q');
    if (initial) {
      this.query.set(initial);
      this.runSearch(initial);
    }
  }

  onQueryInput(value: string): void {
    this.query.set(value);
    this.queryChanges.next(value);
  }

  private runSearch(q: string): void {
    if (!q.trim()) {
      this.results.set([]);
      this.searched.set(false);
      return;
    }

    this.loading.set(true);
    this.router.navigate([], { queryParams: { q }, replaceUrl: true });

    this.searchApi.search(q).subscribe({
      next: (page) => {
        this.results.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
        this.searched.set(true);
        this.searchApi.recent().subscribe((recent) => this.recentSearches.set(recent));
      },
      error: () => this.loading.set(false),
    });
  }

  useRecent(query: string): void {
    this.query.set(query);
    this.runSearch(query);
  }

  openNote(id: string): void {
    this.router.navigate(['/notes', id]);
  }

  // Highlights the free-text portion of the query inside the excerpt -
  // the backend returns plain excerpt text, so this is client-side only,
  // matching the handoff's <mark> treatment.
  highlighted(excerpt: string): SafeHtml {
    const term = this.query()
      .replace(/\b(tag|folder|before|after|is):\S+/gi, '')
      .trim();

    if (!term) return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(excerpt));

    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${escapedTerm})`, 'ig');
    const html = this.escapeHtml(excerpt).replace(pattern, '<mark>$1</mark>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
