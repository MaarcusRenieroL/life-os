import { Component, computed, input, model, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-sign-out-confirm-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './sign-out-confirm-dialog.html',
  styleUrl: './sign-out-confirm-dialog.scss',
})
export class SignOutConfirmDialog {
  visible = model<boolean>(false);
  // null/undefined means "sign out ALL other sessions" mode.
  deviceName = input<string | null>(null);
  confirmed = output<void>();

  protected readonly isAllSessions = computed(() => !this.deviceName());

  protected readonly title = computed(() =>
    this.isAllSessions() ? 'Sign out all other sessions?' : 'Sign out this device?',
  );

  protected readonly description = computed(() =>
    this.isAllSessions()
      ? 'This will immediately end access on every device except this one. Anyone using another session will be logged out.'
      : `This will immediately end access for ${this.deviceName()}. Anyone using that session will be logged out.`,
  );

  protected readonly confirmLabel = computed(() =>
    this.isAllSessions() ? 'Sign out other sessions' : 'Sign out this device',
  );

  protected cancel(): void {
    this.visible.set(false);
  }

  protected confirm(): void {
    this.confirmed.emit();
    this.visible.set(false);
  }
}
