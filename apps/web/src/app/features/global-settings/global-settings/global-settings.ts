import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { APP_MODULES, AppModuleConfig } from '../../../core/config/app-modules';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { DeleteAccountConfirmDialog } from '../../data-management/delete-account-confirm-dialog/delete-account-confirm-dialog';

interface NavItem {
  id: string;
  label: string;
  danger?: boolean;
}

type ThemePreference = 'terminal-dark' | 'light' | 'system';

const NAV_ITEMS: NavItem[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'modules', label: 'Modules' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'data-privacy', label: 'Data & privacy' },
  { id: 'danger-zone', label: 'Danger zone', danger: true },
];

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: 'Terminal dark (default)', value: 'terminal-dark' },
  { label: 'Light', value: 'light' },
  { label: 'System', value: 'system' },
];

@Component({
  selector: 'app-global-settings',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ButtonModule,
    SelectModule,
    ToggleSwitchModule,
    DeleteAccountConfirmDialog,
  ],
  templateUrl: './global-settings.html',
  styleUrl: './global-settings.scss',
})
export class GlobalSettings {
  private readonly currentUserService = inject(CurrentUserService);

  protected readonly navItems = NAV_ITEMS;
  protected readonly themeOptions = THEME_OPTIONS;

  protected readonly user = this.currentUserService.user;
  protected readonly activeSection = signal<string>('profile');

  // Editable copies of the profile fields, prefilled from the current user.
  // No profile-update API exists yet, so edits here are local-only.
  protected readonly name = signal(this.user().name);
  protected readonly email = signal(this.user().email);

  // Mock, local-only copy of the module registry — toggling here does not mutate
  // APP_MODULES or persist anywhere, since there's no backend for module-enablement yet.
  protected readonly modules = signal<AppModuleConfig[]>(APP_MODULES.map((module) => ({ ...module })));

  // TODO: no theme-switching wired up yet, this only records the preference locally.
  protected readonly theme = signal<ThemePreference>('terminal-dark');

  protected readonly deleteAccountDialogVisible = signal(false);

  protected scrollToSection(id: string): void {
    this.activeSection.set(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // No-op — avatar upload requires a real backend endpoint that doesn't exist yet.
  protected changeAvatar(): void {
    // Intentionally does nothing.
  }

  protected toggleModule(code: string): void {
    this.modules.update((current) =>
      current.map((module) => (module.code === code ? { ...module, enabled: !module.enabled } : module)),
    );
  }

  // "Set up" mimics running a module's first-time setup by simply flipping it on locally.
  // Real setup (seeding default views/statuses) needs backend work that doesn't exist yet.
  protected setUpModule(code: string): void {
    this.modules.update((current) =>
      current.map((module) => (module.code === code ? { ...module, enabled: true } : module)),
    );
  }

  protected openDeleteAccountDialog(): void {
    this.deleteAccountDialogVisible.set(true);
  }
}
