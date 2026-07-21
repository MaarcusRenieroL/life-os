import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { VaultApiService } from '../../../core/services/vault-api.service';
import { HealthSummary, VaultEntrySummary } from '../../../core/models/vault.model';
import { MockEntrySecurity, deriveMockSecurity } from '../../../core/utils/vault-mock-security.util';

interface ActionItem {
  id: string;
  title: string;
  issue: string;
  issueClass: string;
  linkLabel: string;
}

interface AgeBucket {
  label: string;
  count: number;
  heightPct: number;
  colorClass: string;
}

@Component({
  selector: 'app-vault-health',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './vault-health.html',
  styleUrl: './vault-health.scss',
})
export class VaultHealth implements OnInit {
  private readonly vaultApi = inject(VaultApiService);

  protected readonly summary = signal<HealthSummary | null>(null);
  protected readonly loading = signal(true);

  // The health score/stats/action-required/age-buckets all come from the real
  // GET /v1/vault/health/summary endpoint now. 2FA insights are the one thing
  // still mocked below - VaultEntry has no column tracking 2FA status yet (see
  // HealthService's class-level TODO on the backend), so entries + the same
  // mock-security util Vault/entries already uses are kept around just for that.
  protected readonly entries = signal<VaultEntrySummary[]>([]);
  private readonly security = computed<Map<string, MockEntrySecurity>>(() =>
    deriveMockSecurity(this.entries()),
  );

  protected readonly stats = computed(() => {
    const summary = this.summary();
    return {
      total: summary?.totalCount ?? 0,
      weak: summary?.weakCount ?? 0,
      duplicate: summary?.duplicateCount ?? 0,
      compromised: summary?.compromisedCount ?? 0,
    };
  });

  protected readonly score = computed(() => this.summary()?.score ?? 100);

  protected readonly scoreLabel = computed(() => {
    const score = this.score();
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs attention';
    return 'Critical';
  });

  protected readonly scoreLabelClass = computed(() => {
    const score = this.score();
    if (score >= 70) return 'text-primary';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  });

  // Matches scoreLabelClass's thresholds - the ring's color should agree with the
  // status text next to it, not always render green regardless of how bad the score is.
  protected readonly scoreRingColor = computed(() => {
    const score = this.score();
    if (score >= 70) return 'var(--primary)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--destructive)';
  });

  protected readonly scoreRingStyle = computed(() => {
    const degrees = Math.round((this.score() / 100) * 360);
    const color = this.scoreRingColor();
    return `background: conic-gradient(${color} 0deg ${degrees}deg, oklch(1 0 0 / 10%) ${degrees}deg 360deg); transition: background 0.3s ease`;
  });

  protected readonly actionItems = computed<ActionItem[]>(() =>
    (this.summary()?.actionRequired ?? []).map((item) => {
      const isWeak = item.issue.toLowerCase().includes('weak');
      return {
        id: item.id,
        title: item.title,
        issue: item.issue,
        issueClass: isWeak ? 'text-warning' : 'text-danger-alt',
        linkLabel: isWeak ? 'Change now' : 'Review',
      };
    }),
  );

  protected readonly twoFactorEnabledCount = computed(() => {
    const security = this.security();
    return this.entries().filter((entry) => security.get(entry.id)?.twoFactor === 'enabled').length;
  });

  protected readonly twoFactorAvailableOffCount = computed(() => {
    const security = this.security();
    return this.entries().filter((entry) => security.get(entry.id)?.twoFactor === 'available-off').length;
  });

  // The backend's age buckets already exclude NOTE-type / password-less entries
  // (see HealthService) - "1y+" is exactly what the design calls "stale".
  protected readonly staleCount = computed(
    () => this.summary()?.ageBuckets.find((bucket) => bucket.label === '1y+')?.count ?? 0,
  );

  protected readonly ageBuckets = computed<AgeBucket[]>(() => {
    const buckets = this.summary()?.ageBuckets ?? [];
    const counts = buckets.map((bucket) => bucket.count);
    const max = Math.max(1, ...counts);
    const colorClasses: Record<string, string> = {
      '<3mo': 'bg-primary',
      '3-6mo': 'bg-primary/70',
      '6-12mo': 'bg-warning',
      '1y+': 'bg-destructive',
    };

    return buckets.map((bucket) => ({
      label: bucket.label,
      count: bucket.count,
      heightPct: Math.max(4, Math.round((bucket.count / max) * 100)),
      colorClass: colorClasses[bucket.label] ?? 'bg-primary',
    }));
  });

  ngOnInit(): void {
    this.vaultApi.getHealthSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    // Only needed for the still-mocked 2FA insights above - not the source of
    // the score/stats/action-required/age-buckets anymore.
    this.vaultApi.getEntries().subscribe({
      next: (entries) => this.entries.set(entries),
      error: () => undefined,
    });
  }
}
