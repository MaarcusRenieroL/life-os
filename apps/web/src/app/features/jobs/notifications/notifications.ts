import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';

import { NotificationResponse } from '../../../core/models/job-tracker.model';
import { NotificationApiService } from '../../../core/services/notification-api.service';
import { NotificationSocketService } from '../../../core/services/notification-socket.service';

@Component({
  selector: 'app-jobs-notifications',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class JobsNotifications implements OnInit, OnDestroy {
  private readonly notificationApi = inject(NotificationApiService);
  private readonly socket = inject(NotificationSocketService);

  protected readonly loading = signal(true);
  protected readonly notifications = signal<NotificationResponse[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const incoming = this.socket.latestNotification();
      if (incoming) {
        this.notifications.update((current) => [incoming, ...current]);
      }
    });
  }

  ngOnInit(): void {
    this.socket.connect();
    this.notificationApi.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications.set(notifications);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(this.messageFor(err, 'Could not load notifications'));
      },
    });
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }

  protected markAsRead(notification: NotificationResponse): void {
    if (notification.isRead) {
      return;
    }
    this.notificationApi.markAsRead(notification.id).subscribe({
      next: (updated) => {
        this.notifications.update((current) => current.map((n) => (n.id === updated.id ? updated : n)));
      },
    });
  }

  private messageFor(err: unknown, fallback: string): string {
    const httpError = err as { error?: { message?: string } };
    return httpError?.error?.message ?? fallback;
  }
}
