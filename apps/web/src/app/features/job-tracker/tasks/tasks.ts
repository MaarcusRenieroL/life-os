import { Component, OnInit, inject, signal } from '@angular/core';

import {
  FollowUpTask,
  JobNotification,
  JobTrackerExtrasApiService,
} from '../../../core/services/job-tracker-extras-api.service';

@Component({
  selector: 'app-job-tasks',
  standalone: true,
  imports: [],
  templateUrl: './tasks.html',
})
export class JobTasks implements OnInit {
  private readonly api = inject(JobTrackerExtrasApiService);

  protected readonly tasks = signal<FollowUpTask[]>([]);
  protected readonly notifications = signal<JobNotification[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.api.followUps('OPEN').subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.notifications().subscribe({ next: (items) => this.notifications.set(items) });
  }

  protected complete(task: FollowUpTask): void {
    this.api.completeFollowUp(task.id).subscribe({ next: () => this.drop(task.id) });
  }

  protected dismiss(task: FollowUpTask): void {
    this.api.dismissFollowUp(task.id).subscribe({ next: () => this.drop(task.id) });
  }

  private drop(id: string): void {
    this.tasks.set(this.tasks().filter((task) => task.id !== id));
  }

  protected markRead(notification: JobNotification): void {
    this.api.markNotificationRead(notification.id).subscribe({
      next: () =>
        this.notifications.set(
          this.notifications().map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        ),
    });
  }

  protected markAllRead(): void {
    this.api.markAllNotificationsRead().subscribe({
      next: () =>
        this.notifications.set(this.notifications().map((item) => ({ ...item, read: true }))),
    });
  }

  protected overdue(task: FollowUpTask): boolean {
    return new Date(task.dueDate).getTime() < Date.now();
  }
}
