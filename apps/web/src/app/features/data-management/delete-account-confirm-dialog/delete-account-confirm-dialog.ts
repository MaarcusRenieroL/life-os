import { Component, inject, model, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { AuthApiService } from '../../../core/services/auth-api.service';
import { TokenService } from '../../../core/services/token.service';
import { VaultApiService } from '../../../core/services/vault-api.service';

@Component({
  selector: 'app-delete-account-confirm-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './delete-account-confirm-dialog.html',
  styleUrl: './delete-account-confirm-dialog.scss',
})
export class DeleteAccountConfirmDialog {
  visible = model<boolean>(false);

  private readonly vaultApi = inject(VaultApiService);
  private readonly authApi = inject(AuthApiService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected cancel(): void {
    this.visible.set(false);
  }

  /**
   * Deletes vault data first (still authenticated at that point), then the account
   * itself in auth-service (which removes the row backing the current JWT), then
   * clears local tokens and redirects. If the vault call fails, the account is left
   * fully intact - nothing here has torched anything at that point. If vault succeeds
   * but the auth call fails, vault data is already gone; the error message says so
   * explicitly rather than pretending nothing happened.
   */
  protected confirmDelete(): void {
    if (this.deleting()) return;

    this.deleting.set(true);
    this.errorMessage.set(null);

    this.vaultApi.deleteAccount().subscribe({
      next: () => {
        this.authApi.deleteAccount().subscribe({
          next: () => {
            this.deleting.set(false);
            this.tokenService.clear();
            this.visible.set(false);
            this.router.navigateByUrl('/login');
          },
          error: (error) => {
            this.deleting.set(false);
            this.errorMessage.set(
              error?.error?.message ??
                'Vault data was deleted, but the account itself could not be removed. Try again.',
            );
          },
        });
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(error?.error?.message ?? 'Unable to delete account.');
      },
    });
  }
}
