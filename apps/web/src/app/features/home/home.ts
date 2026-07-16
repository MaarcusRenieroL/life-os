import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';

import { AuthApiService } from '../../core/services/auth-api.service';
import { TokenService } from '../../core/services/token.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ButtonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly authApi = inject(AuthApiService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  logout(): void {
    this.authApi
      .logout()
      .pipe(
        finalize(() => {
          this.tokenService.clear();
          this.router.navigateByUrl('/login');
        }),
      )
      .subscribe({ error: () => undefined });
  }
}
