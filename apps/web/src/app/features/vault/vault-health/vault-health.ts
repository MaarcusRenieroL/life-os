import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { VaultApiService } from '../../../core/services/vault-api.service';
import { HealthSummary } from '../../../core/models/vault.model';

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
  }
}
