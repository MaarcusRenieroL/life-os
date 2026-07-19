import { Component, computed, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';

import { ChangeMasterPasswordDialog } from '../change-master-password-dialog/change-master-password-dialog';
import { RecoveryCodesDialog } from '../recovery-codes-dialog/recovery-codes-dialog';
import { SignOutConfirmDialog } from '../sign-out-confirm-dialog/sign-out-confirm-dialog';

interface DeviceSession {
  id: string;
  name: string;
  location: string;
  isCurrentDevice: boolean;
}

const SESSION_TIMEOUT_OPTIONS = [
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '60 minutes', value: 60 },
];

// TODO(backend): no sessions/devices API yet, this list is in-memory only.
const SEED_DEVICES: DeviceSession[] = [
  { id: 'device-1', name: 'MacBook Pro - Chrome', location: 'San Francisco, CA', isCurrentDevice: true },
  { id: 'device-2', name: 'iPhone 15 - life-os app', location: 'San Francisco, CA', isCurrentDevice: false },
];

@Component({
  selector: 'app-security-page',
  standalone: true,
  imports: [
    ButtonModule,
    SelectModule,
    ToggleSwitchModule,
    FormsModule,
    ChangeMasterPasswordDialog,
    RecoveryCodesDialog,
    SignOutConfirmDialog,
  ],
  templateUrl: './security-page.html',
  styleUrl: './security-page.scss',
})
export class SecurityPage {
  // TODO(backend): no change-master-password API yet, "last changed" is static mock copy.
  protected readonly masterPasswordStrengthPct = 85;
  protected readonly lastChangedLabel = 'last changed 4 months ago';

  protected readonly sessionTimeoutOptions = SESSION_TIMEOUT_OPTIONS;

  // Mock, local-only preferences — not persisted anywhere real.
  protected readonly biometricUnlock = signal(true);
  protected readonly sessionTimeoutMinutes = signal(15);

  protected readonly devices = signal<DeviceSession[]>(SEED_DEVICES);
  protected readonly otherDevices = computed(() => this.devices().filter((d) => !d.isCurrentDevice));

  protected readonly changeMasterPasswordVisible = signal(false);
  protected readonly recoveryCodesVisible = signal(false);
  protected readonly signOutConfirmVisible = signal(false);
  protected readonly signOutTargetDeviceId = signal<string | null>(null);

  protected readonly signOutTargetDeviceName = computed(() => {
    const id = this.signOutTargetDeviceId();
    if (!id) return null;
    return this.devices().find((d) => d.id === id)?.name ?? null;
  });

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

    if (targetId) {
      this.devices.update((current) => current.filter((d) => d.id !== targetId));
    } else {
      this.devices.update((current) => current.filter((d) => d.isCurrentDevice));
    }
  }
}
