import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
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
import { PasswordStrength, VaultStatus } from '../../../core/models/vault.model';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { TokenService } from '../../../core/services/token.service';
import { VaultApiService } from '../../../core/services/vault-api.service';

const STRENGTH_PCT: Record<PasswordStrength, number> = {
  VERY_WEAK: 20,
  WEAK: 40,
  FAIR: 60,
  STRONG: 80,
  VERY_STRONG: 100,
};

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  VERY_WEAK: 'Very weak',
  WEAK: 'Weak',
  FAIR: 'Fair',
  STRONG: 'Strong',
  VERY_STRONG: 'Very strong',
};

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
  protected readonly vaultApiService = inject(VaultApiService);

  protected readonly vaultStatus = signal<VaultStatus | null>(null);

  protected readonly masterPasswordStrengthPct = computed(() => {
    const strength = this.vaultStatus()?.masterPasswordStrength;
    return strength ? STRENGTH_PCT[strength] : 0;
  });

  protected readonly masterPasswordStrengthLabel = computed(() => {
    const strength = this.vaultStatus()?.masterPasswordStrength;
    return strength ? STRENGTH_LABEL[strength] : 'Unknown';
  });

  protected readonly lastChangedLabel = computed(() => {
    const updatedAt = this.vaultStatus()?.masterPasswordUpdatedAt;
    if (!updatedAt) return '';

    const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (24 * 60 * 60 * 1000));
    if (days < 1) return 'changed today';
    if (days < 60) return `changed ${days} day${days === 1 ? '' : 's'} ago`;

    const months = Math.round(days / 30);
    return `changed ${months} month${months === 1 ? '' : 's'} ago`;
  });

  constructor() {
    // ChangeMasterPasswordDialog rotates the master password on success and
    // closes itself afterward - refetch status on that true -> false transition
    // so the strength bar/last-changed label don't go stale.
    let wasChangeDialogOpen = false;
    effect(() => {
      const isOpen = this.changeMasterPasswordVisible();
      if (wasChangeDialogOpen && !isOpen) {
        this.loadVaultStatus();
      }
      wasChangeDialogOpen = isOpen;
    });
  }

  ngOnInit(): void {
    this.loadSessions();
    this.loadVaultStatus();
  }

  private loadSessions(): void {
    this.authApiService.listSessions().subscribe({
      next: (sessions) => this.devices.set(sessions),
      error: () => undefined,
    });
  }

  private loadVaultStatus(): void {
    this.vaultApiService.getStatus().subscribe({
      next: (status) => this.vaultStatus.set(status),
      error: () => undefined,
    });
  }

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
