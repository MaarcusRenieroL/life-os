import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { APP_MODULES, AppModuleConfig } from '../../core/config/app-modules';
import { VaultEntrySummary } from '../../core/models/vault.model';
import { AuthApiService } from '../../core/services/auth-api.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { TokenService } from '../../core/services/token.service';
import { VaultApiService } from '../../core/services/vault-api.service';
import { deriveMockSecurity } from '../../core/utils/vault-mock-security.util';
import { finalize } from 'rxjs';

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
  private readonly router = inject(Router);

  protected readonly user = this.currentUserService.user;
  protected readonly today = new Date();

  protected readonly entries = signal<VaultEntrySummary[]>([]);

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

  private readonly security = computed(() => deriveMockSecurity(this.entries()));

  protected readonly vaultActionRequiredCount = computed(() => {
    const security = this.security();
    return this.entries().filter((entry) => {
      const strength = security.get(entry.id)?.strength;
      return strength === 'Weak' || strength === 'Reused';
    }).length;
  });

  // TODO: wire to Job Tracker once that module has a frontend/backend integration.
  protected readonly interviewsThisWeek: number | null = null;
  protected readonly offersPending: number | null = null;

  protected readonly homeModuleTiles = computed<ModuleTile[]>(() => {
    const entries = this.entries();
    const actionRequired = this.vaultActionRequiredCount();

    return APP_MODULES.slice(0, 4).map((module) => this.toModuleTile(module, entries.length, actionRequired));
  });

  protected readonly exploreModules = computed<AppModuleConfig[]>(() => APP_MODULES.slice(4));

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

    const weakEntry = this.entries().find((entry) => this.security().get(entry.id)?.strength === 'Weak');
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

    return { code: module.code, name: module.name, enabled: false, subtitle: 'not set up yet' };
  }
}
