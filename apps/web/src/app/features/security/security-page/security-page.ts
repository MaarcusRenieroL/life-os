import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { concatMap, from, toArray } from 'rxjs';

import { ChangeMasterPasswordDialog } from '../change-master-password-dialog/change-master-password-dialog';
import { RecoveryCodesDialog } from '../recovery-codes-dialog/recovery-codes-dialog';
import { SignOutConfirmDialog } from '../sign-out-confirm-dialog/sign-out-confirm-dialog';
import { DeviceSession } from '../../../core/models/auth.model';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { TokenService } from '../../../core/services/token.service';

const SESSION_TIMEOUT_OPTIONS = [
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '60 minutes', value: 60 },
];

@Component({
  selector: 'app-security-page',
  standalone: true,
  imports: [
    ButtonModule,
    SelectModule,
    ToggleSwitchModule,
    TooltipModule,
    FormsModule,
    ChangeMasterPasswordDialog,
    RecoveryCodesDialog,
    SignOutConfirmDialog,
  ],
  templateUrl: './security-page.html',
  styleUrl: './security-page.scss',
})
export class SecurityPage implements OnInit {
  protected readonly authApiService = inject(AuthApiService);
  protected readonly tokenService = inject(TokenService);

  ngOnInit(): void {
    this.loadSessions();
  }

  private loadSessions(): void {
    this.authApiService.listSessions().subscribe({
      next: (sessions) => this.devices.set(sessions),
      error: () => undefined,
    });
  }

  protected readonly masterPasswordStrengthPct = 85;
  protected readonly lastChangedLabel = 'last changed 4 months ago';

  protected readonly sessionTimeoutOptions = SESSION_TIMEOUT_OPTIONS;

  protected readonly biometricUnlock = signal(true);
  protected readonly sessionTimeoutMinutes = signal(15);

  protected readonly devices = signal<DeviceSession[]>([]);
  protected readonly otherDevices = computed(() =>
    this.devices().filter((d) => !(d.id === this.tokenService.getDeviceSessionId())),
  );

  protected readonly changeMasterPasswordVisible = signal(false);
  protected readonly recoveryCodesVisible = signal(false);
  protected readonly signOutConfirmVisible = signal(false);
  protected readonly signOutTargetDeviceId = signal<string | null>(null);

  protected readonly signOutTargetDeviceName = computed(() => {
    const id = this.signOutTargetDeviceId();
    if (!id) return null;
    return this.devices().find((d) => d.id === id)?.deviceName ?? null;
  });

  protected isCurrentDevice(session: DeviceSession): boolean {
    return session.id === this.tokenService.getDeviceSessionId();
  }

  protected openChangeMasterPassword(): void {
    this.changeMasterPasswordVisible.set(true);
  }

  protected openRecoveryCodes(): void {
    this.recoveryCodesVisible.set(true);
  }

  protected signOutDevice(deviceId: string): void {
    this.signOutTargetDeviceId.set(deviceId);
    this.signOutConfirmVisible.set(true);
  }

  protected signOutAllOtherSessions(): void {
    this.signOutTargetDeviceId.set(null);
    this.signOutConfirmVisible.set(true);
  }

  protected confirmSignOut(): void {
    const targetId = this.signOutTargetDeviceId();
    const idsToRevoke = targetId ? [targetId] : this.otherDevices().map((d) => d.id);

    from(idsToRevoke)
      .pipe(
        concatMap((id) => this.authApiService.revokeSession(id)),
        toArray(),
      )
      .subscribe(() => this.loadSessions());
  }
}
