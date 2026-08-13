import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { NoteSearchApiService } from '../../../core/services/note-search-api.service';
import { RecentSearch, SearchResult } from '../../../core/models/notes.model';

@Component({
  selector: 'app-note-search',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './note-search.html',
  styleUrl: './note-search.scss',
})
export class NoteSearch implements OnInit {
  private readonly searchApi = inject(NoteSearchApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly query = signal('');
  protected readonly results = signal<SearchResult[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly recentSearches = signal<RecentSearch[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);

  private queryChanges = new Subject<string>();

  ngOnInit(): void {
    this.searchApi.recent().subscribe((recent) => this.recentSearches.set(recent));

    this.queryChanges.pipe(debounceTime(350), distinctUntilChanged()).subscribe((q) => this.runSearch(q));

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
}
