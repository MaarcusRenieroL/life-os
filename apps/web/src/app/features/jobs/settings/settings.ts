import { Component, OnInit, inject, signal } from '@angular/core';

import { NotificationSettingsResponse } from '../../../core/models/job-tracker.model';
import { NotificationApiService } from '../../../core/services/notification-api.service';

@Component({
  selector: 'app-jobs-settings',
  standalone: true,
  imports: [],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class JobsSettings implements OnInit {
  private readonly notificationApi = inject(NotificationApiService);

  protected readonly loading = signal(true);
  protected readonly settings = signal<NotificationSettingsResponse | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.notificationApi.getSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(this.messageFor(err, 'Could not load settings'));
      },
    });
  }

  protected toggle(field: 'emailOnStageChange' | 'emailOnInterviewScheduled' | 'emailOnOfferReceived' | 'emailOnFollowUpDue'): void {
    const current = this.settings();
    if (!current) {
      return;
    }
    const value = !current[field];
    this.notificationApi.updateSettings({ [field]: value }).subscribe({
      next: (updated) => this.settings.set(updated),
      error: (err) => this.errorMessage.set(this.messageFor(err, 'Could not update settings')),
    });
  }

  private messageFor(err: unknown, fallback: string): string {
    const httpError = err as { error?: { message?: string } };
    return httpError?.error?.message ?? fallback;
  }
}
