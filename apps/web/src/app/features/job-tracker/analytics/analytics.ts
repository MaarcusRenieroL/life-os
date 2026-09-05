import { KeyValuePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { JobTrackerExtrasApiService } from '../../../core/services/job-tracker-extras-api.service';

@Component({
  selector: 'app-job-analytics',
  standalone: true,
  imports: [KeyValuePipe],
  templateUrl: './analytics.html',
})
export class JobAnalytics implements OnInit {
  private readonly api = inject(JobTrackerExtrasApiService);

  protected readonly data = signal<Record<string, unknown> | null>(null);
  protected readonly offers = signal<Record<string, unknown>[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.api.analytics().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.offerComparison().subscribe({ next: (offers) => this.offers.set(offers) });
  }

  protected section(key: string): Record<string, unknown> {
    return (this.data()?.[key] as Record<string, unknown>) ?? {};
  }

  protected rows(key: string): Record<string, unknown>[] {
    const value = this.data()?.[key];
    return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  }
}
