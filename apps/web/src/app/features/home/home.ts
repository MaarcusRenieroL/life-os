import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { TokenService } from '../../core/services/token.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  logout(): void {
    this.tokenService.clear();
    this.router.navigateByUrl('/login');
  }
}
