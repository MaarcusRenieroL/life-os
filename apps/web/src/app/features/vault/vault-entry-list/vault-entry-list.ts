import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { VaultApiService } from '../../../core/services/vault-api.service';
import { VaultStateService } from '../../../core/services/vault-state.service';
import { VaultEntrySummary } from '../../../core/models/vault.model';

@Component({
  selector: 'app-vault-entry-list',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  templateUrl: './vault-entry-list.html',
  styleUrl: './vault-entry-list.scss',
})
export class VaultEntryList implements OnInit {
  private readonly vaultApi = inject(VaultApiService);
  protected readonly vaultState = inject(VaultStateService);
  private readonly router = inject(Router);

  protected readonly entries = signal<VaultEntrySummary[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.vaultApi.getStatus().subscribe((status) => this.vaultState.setUnlocked(status.unlocked));

    this.vaultApi.getEntries().subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openEntry(id: string): void {
    this.router.navigateByUrl(`/vault/entry/${id}`);
  }
}
