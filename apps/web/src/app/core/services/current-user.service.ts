import { Injectable, inject, signal } from '@angular/core';

import { UserProfileResponse } from '../models/auth.model';
import { AuthApiService } from './auth-api.service';

export interface CurrentUser {
  name: string;
  email: string;
  initials: string;
}

const EMPTY_USER: CurrentUser = { name: '', email: '', initials: '' };

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly authApi = inject(AuthApiService);

  readonly user = signal<CurrentUser>(EMPTY_USER);

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.authApi.getMe().subscribe({
      next: (profile) => this.user.set(toCurrentUser(profile)),
      error: () => undefined,
    });
  }

  // Lets a successful profile-name save update the navbar/home greeting
  // immediately, without waiting on a second round trip to GET /me.
  setName(name: string): void {
    this.user.update((current) => ({
      ...current,
      name,
      initials: computeInitials(name, current.email),
    }));
  }
}

function toCurrentUser(profile: UserProfileResponse): CurrentUser {
  const name = profile.name?.trim() || profile.email;
  return { name, email: profile.email, initials: computeInitials(name, profile.email) };
}

function computeInitials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}
