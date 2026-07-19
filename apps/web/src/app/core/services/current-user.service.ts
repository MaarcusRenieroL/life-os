import { Injectable, signal } from '@angular/core';

export interface CurrentUser {
  name: string;
  email: string;
  initials: string;
}

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  // TODO: replace with a real /v1/auth/me lookup once the backend exposes one.
  readonly user = signal<CurrentUser>({
    name: 'Maarcus Reniero',
    email: 'maarcusreniero.l@gmail.com',
    initials: 'MR',
  });
}
