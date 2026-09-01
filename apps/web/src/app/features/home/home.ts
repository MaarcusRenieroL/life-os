import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { APP_MODULES, AppModuleConfig } from '../../core/config/app-modules';
import { HealthSummary, VaultEntrySummary } from '../../core/models/vault.model';
import { AuthApiService } from '../../core/services/auth-api.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { FinanceAccountApiService } from '../../core/services/finance-account-api.service';
import { FinanceTransactionApiService } from '../../core/services/finance-transaction-api.service';
import { NotesApiService } from '../../core/services/notes-api.service';
import { TokenService } from '../../core/services/token.service';
import { VaultApiService } from '../../core/services/vault-api.service';
import { catchError, finalize, of } from 'rxjs';

interface ModuleTile {
  code: string;
  name: string;
  enabled: boolean;
  path?: string;
  subtitle: string;
}

interface ActivityItem {
  dotClass: string;
  text: string;
  meta: string;
}

interface AttentionItem {
  title: string;
  meta: string;
  arrowClass: string;
  link: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly tokenService = inject(TokenService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly vaultApi = inject(VaultApiService);
  private readonly notesApi = inject(NotesApiService);
  private readonly financeAccountApi = inject(FinanceAccountApiService);
  private readonly financeTransactionApi = inject(FinanceTransactionApiService);
  private readonly router = inject(Router);

  protected readonly noteCount = signal<number | null>(null);
  protected readonly financeTotalBalance = signal<number | null>(null);
  protected readonly financeNeedsReviewCount = signal(0);

  protected readonly user = this.currentUserService.user;
  protected readonly today = new Date();

  protected readonly entries = signal<VaultEntrySummary[]>([]);
  protected readonly healthSummary = signal<HealthSummary | null>(null);

  protected readonly firstName = computed(() => this.user().name.split(' ')[0]);

  protected readonly greeting = computed(() => {
    const hour = this.today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });

  protected readonly modulesActiveCount = computed(
    () => APP_MODULES.filter((module) => module.enabled).length,
  );

  protected readonly vaultActionRequiredCount = computed(() => {
    const summary = this.healthSummary();
    return (summary?.weakCount ?? 0) + (summary?.duplicateCount ?? 0);
  });

  // TODO: wire to Job Tracker once that module has a frontend/backend integration.
  protected readonly interviewsThisWeek: number | null = null;
  protected readonly offersPending: number | null = null;

  // Built, working modules (PM, NT, ...) sort ahead of not-yet-built ones so
  // the visible "YOUR MODULES" grid always leads with something clickable -
  // previously this was a plain APP_MODULES.slice(0, 4), which put Notes
  // (declared later in the array, but fully working) behind three disabled
  // placeholders and left it with no way to reach it from Home at all.
  private readonly orderedModules = computed<AppModuleConfig[]>(() => {
    const enabled = APP_MODULES.filter((m) => m.enabled);
    const disabled = APP_MODULES.filter((m) => !m.enabled);
    return [...enabled, ...disabled];
  });

  protected readonly homeModuleTiles = computed<ModuleTile[]>(() => {
    const entries = this.entries();
    const actionRequired = this.vaultActionRequiredCount();
    // Read so this tile list recomputes once finance data resolves.
    this.financeTotalBalance();
    this.financeNeedsReviewCount();

    return this.orderedModules().slice(0, 4).map((module) => this.toModuleTile(module, entries.length, actionRequired));
  });

  protected readonly exploreModules = computed<AppModuleConfig[]>(() => this.orderedModules().slice(4));

  // TODO(backend): needs a real cross-module activity feed; this is static mock data
  // matching the design handoff's tone until that endpoint exists.
  protected readonly recentActivity: ActivityItem[] = [
    { dotClass: 'bg-warning', text: 'Datadog moved to <b>Offer</b> — decide by Friday', meta: '2h ago' },
    { dotClass: 'bg-primary', text: 'Password changed for <b>Chase Bank</b>', meta: '9h ago' },
    { dotClass: 'bg-foreground/35', text: '22 new postings imported from LinkedIn &amp; Indeed', meta: '1d ago' },
    { dotClass: 'bg-destructive', text: 'Compromised alert for <b>Figma</b>', meta: '2d ago' },
    { dotClass: 'bg-primary', text: 'Ramp moved to <b>Tech Interview</b>', meta: '4d ago' },
  ];

  protected readonly attentionItems = computed<AttentionItem[]>(() => {
    const items: AttentionItem[] = [
      // Static mock rows for modules with no frontend yet.
      { title: 'Decide on Datadog offer', meta: 'due Friday', arrowClass: 'text-warning', link: '#' },
    ];

    const weakEntry = this.healthSummary()?.actionRequired.find((item) =>
      item.issue.toLowerCase().includes('weak'),
    );
    if (weakEntry) {
      items.push({
        title: `Change weak password — ${weakEntry.title}`,
        meta: 'flagged by password health',
        arrowClass: 'text-destructive',
        link: '/vault/health',
      });
    }

    items.push({
      title: 'Prep for Ramp tech interview',
      meta: 'tomorrow, 2pm',
      arrowClass: 'text-primary',
      link: '#',
    });

    return items;
  });

  ngOnInit(): void {
    this.vaultApi.getEntries().subscribe({
      next: (entries) => this.entries.set(entries),
      error: () => undefined,
    });

    // Best-effort - requires the vault to be unlocked (it decrypts passwords to
    // score them), so this silently stays null if it's locked.
    this.vaultApi.getHealthSummary().subscribe({
      next: (summary) => this.healthSummary.set(summary),
      error: () => undefined,
    });

    this.notesApi.list({ page: 0, size: 1 }).subscribe({
      next: (page) => this.noteCount.set(page.totalElements),
      error: () => this.noteCount.set(0),
    });

    this.financeAccountApi
      .getAccounts()
      .pipe(catchError(() => of(null)))
      .subscribe((accounts) => {
        if (accounts) {
          this.financeTotalBalance.set(accounts.reduce((sum, a) => sum + a.currentBalance, 0));
        }
      });

    this.financeTransactionApi
      .getTransactions(0, 50)
      .pipe(catchError(() => of(null)))
      .subscribe((page) => {
        if (page) {
          this.financeNeedsReviewCount.set(
            page.content.filter((t) => t.categoryId === null && t.type !== 'CREDIT').length,
          );
        }
      });
  }

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

  private toModuleTile(
    module: AppModuleConfig,
    totalItems: number,
    actionRequired: number,
  ): ModuleTile {
    if (module.code === 'PM') {
      const subtitle =
        actionRequired > 0
          ? `${totalItems} items · ${actionRequired} need attention`
          : `${totalItems} items`;
      return { code: module.code, name: module.name, enabled: true, path: module.path, subtitle };
    }

    if (module.code === 'NT') {
      const count = this.noteCount();
      const subtitle = count === null ? 'loading…' : `${count} ${count === 1 ? 'note' : 'notes'}`;
      return { code: module.code, name: module.name, enabled: true, path: module.path, subtitle };
    }

    if (module.code === 'FN') {
      const balance = this.financeTotalBalance();
      const needsReview = this.financeNeedsReviewCount();
      const subtitle =
        balance === null
          ? 'loading…'
          : needsReview > 0
            ? `₹${balance.toLocaleString('en-IN')} balance · ${needsReview} need review`
            : `₹${balance.toLocaleString('en-IN')} balance`;
      return { code: module.code, name: module.name, enabled: true, path: module.path, subtitle };
    }

    if (!module.enabled) {
      return { code: module.code, name: module.name, enabled: false, subtitle: 'not set up yet' };
    }

    return { code: module.code, name: module.name, enabled: true, path: module.path, subtitle: 'open module' };
  }
}
