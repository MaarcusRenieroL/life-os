import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { VaultApiService } from '../../../core/services/vault-api.service';
import { VaultEntrySummary } from '../../../core/models/vault.model';
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

const DAY_MS = 86_400_000;

@Component({
  selector: 'app-vault-health',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './vault-health.html',
  styleUrl: './vault-health.scss',
})
export class VaultHealth implements OnInit {
  private readonly vaultApi = inject(VaultApiService);

  protected readonly entries = signal<VaultEntrySummary[]>([]);
  protected readonly loading = signal(true);

  protected readonly security = computed<Map<string, MockEntrySecurity>>(() =>
    deriveMockSecurity(this.entries()),
  );

  // The backend doesn't flag "compromised in a breach" yet, so as a mock proxy
  // we treat every other reused-password entry (deterministic by list order,
  // not random) as "compromised" for the purpose of this dashboard.
  protected readonly compromisedIds = computed<Set<string>>(() => {
    const security = this.security();
    const reused = this.entries().filter((entry) => security.get(entry.id)?.strength === 'Reused');
    return new Set(reused.filter((_, index) => index % 2 === 0).map((entry) => entry.id));
  });

  protected readonly stats = computed(() => {
    const security = this.security();
    const entries = this.entries();
    const compromised = this.compromisedIds();

    let weak = 0;
    let duplicate = 0;

    for (const entry of entries) {
      const value = security.get(entry.id);
      if (value?.strength === 'Weak') weak++;
      if (value?.strength === 'Reused') duplicate++;
    }

    return { total: entries.length, weak, duplicate, compromised: compromised.size };
  });

  protected readonly score = computed(() => {
    const { total, weak, duplicate, compromised } = this.stats();
    if (total === 0) return 100;

    const security = this.security();
    let availableOff = 0;
    for (const entry of this.entries()) {
      if (security.get(entry.id)?.twoFactor === 'available-off') availableOff++;
    }

    const penalty = weak * 5 + duplicate * 8 + compromised * 15 + availableOff * 3;
    return Math.max(0, Math.min(100, Math.round(100 - penalty)));
  });

  protected readonly scoreLabel = computed(() => {
    const score = this.score();
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs attention';
    return 'Critical';
  });

  protected readonly scoreLabelClass = computed(() => {
    const score = this.score();
    if (score >= 85) return 'text-primary';
    if (score >= 70) return 'text-primary';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  });

  protected readonly scoreRingStyle = computed(() => {
    const degrees = Math.round((this.score() / 100) * 360);
    return `background: conic-gradient(var(--primary) 0deg ${degrees}deg, oklch(1 0 0 / 10%) ${degrees}deg 360deg)`;
  });

  protected readonly actionItems = computed<ActionItem[]>(() => {
    const security = this.security();
    const compromised = this.compromisedIds();

    return this.entries()
      .filter((entry) => {
        const strength = security.get(entry.id)?.strength;
        return strength === 'Weak' || strength === 'Reused';
      })
      .map((entry) => this.toActionItem(entry, security.get(entry.id)!, compromised.has(entry.id)));
  });

  protected readonly twoFactorEnabledCount = computed(() => {
    const security = this.security();
    return this.entries().filter((entry) => security.get(entry.id)?.twoFactor === 'enabled').length;
  });

  protected readonly twoFactorAvailableOffCount = computed(() => {
    const security = this.security();
    return this.entries().filter((entry) => security.get(entry.id)?.twoFactor === 'available-off').length;
  });

  protected readonly staleCount = computed(
    () => this.entries().filter((entry) => this.ageInDays(entry.updatedAt) > 365).length,
  );

  protected readonly ageBuckets = computed<AgeBucket[]>(() => {
    const entries = this.entries();
    let under3mo = 0;
    let from3to6mo = 0;
    let from6to12mo = 0;
    let over1yr = 0;

    for (const entry of entries) {
      const days = this.ageInDays(entry.updatedAt);
      if (days < 90) under3mo++;
      else if (days < 180) from3to6mo++;
      else if (days < 365) from6to12mo++;
      else over1yr++;
    }

    const counts = [under3mo, from3to6mo, from6to12mo, over1yr];
    const max = Math.max(1, ...counts);

    const labels = ['<3mo', '3-6mo', '6-12mo', '1yr+'];
    const colorClasses = ['bg-primary', 'bg-primary/70', 'bg-warning', 'bg-destructive'];

    return counts.map((count, index) => ({
      label: labels[index],
      count,
      heightPct: Math.max(4, Math.round((count / max) * 100)),
      colorClass: colorClasses[index],
    }));
  });

  ngOnInit(): void {
    this.vaultApi.getEntries().subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private toActionItem(
    entry: VaultEntrySummary,
    security: MockEntrySecurity,
    isCompromised: boolean,
  ): ActionItem {
    if (isCompromised) {
      return {
        id: entry.id,
        title: entry.title,
        issue: 'found in a data breach',
        issueClass: 'text-destructive',
        linkLabel: 'Change now',
      };
    }

    if (security.strength === 'Weak') {
      const noTwoFactor = security.twoFactor !== 'enabled';
      return {
        id: entry.id,
        title: entry.title,
        issue: noTwoFactor ? 'weak, no 2FA' : 'weak password',
        issueClass: 'text-foreground/50',
        linkLabel: 'Change now',
      };
    }

    return {
      id: entry.id,
      title: entry.title,
      issue: 'reused password',
      issueClass: 'text-foreground/50',
      linkLabel: 'Review',
    };
  }

  private ageInDays(dateString: string): number {
    return (Date.now() - new Date(dateString).getTime()) / DAY_MS;
  }
}
