import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { NoteGraph } from '../models/notes.model';

@Injectable({ providedIn: 'root' })
export class NoteGraphApiService {
  private readonly http = inject(HttpClient);

  get(): Observable<NoteGraph> {
    return this.http
      .get<ApiResponse<NoteGraph>>('/v1/notes/graph')
      .pipe(map((response) => response.data));
  }
}
