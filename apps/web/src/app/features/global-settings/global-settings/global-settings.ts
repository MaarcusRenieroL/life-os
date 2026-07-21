import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { APP_MODULES, AppModuleConfig } from '../../../core/config/app-modules';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { CoreApiService } from '../../../core/services/core-api.service';
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
    InputTextModule,
    SelectModule,
    ToggleSwitchModule,
    DeleteAccountConfirmDialog,
  ],
  templateUrl: './global-settings.html',
  styleUrl: './global-settings.scss',
})
export class GlobalSettings implements OnInit {
  private readonly currentUserService = inject(CurrentUserService);
  private readonly authApi = inject(AuthApiService);
  private readonly coreApi = inject(CoreApiService);

  protected readonly navItems = NAV_ITEMS;
  protected readonly themeOptions = THEME_OPTIONS;

  protected readonly user = this.currentUserService.user;
  protected readonly activeSection = signal<string>('profile');

  // Editable copy of the name field, prefilled from the current user. Email
  // has no update endpoint (it's the login identifier) so it's shown read-only.
  protected readonly name = signal(this.user().name);
  protected readonly email = computed(() => this.user().email);

  protected readonly savingProfile = signal(false);
  protected readonly profileSaved = signal(false);
  protected readonly profileError = signal<string | null>(null);

  // CurrentUserService's initial fetch is async, so `user()` is still the empty
  // placeholder when this component constructs - hydrate the editable `name`
  // signal once real data lands, but only once, so it doesn't clobber typing.
  private hydratedName = false;

  // Starts from the static registry's defaults (Password Manager enabled, everything
  // else off); ngOnInit overlays any per-user overrides the backend actually has -
  // a module the user never touched has no row there and just keeps its default.
  protected readonly modules = signal<AppModuleConfig[]>(APP_MODULES.map((module) => ({ ...module })));
  protected readonly modulesError = signal<string | null>(null);

  // TODO: no theme-switching wired up yet, this only records the preference locally.
  protected readonly theme = signal<ThemePreference>('terminal-dark');

  protected readonly deleteAccountDialogVisible = signal(false);

  constructor() {
    effect(() => {
      const current = this.user();
      if (!this.hydratedName && current.email) {
        this.name.set(current.name);
        this.hydratedName = true;
      }
    });
  }

  ngOnInit(): void {
    this.coreApi.getModuleSettings().subscribe({
      next: (settings) => {
        const overrides = new Map(settings.map((s) => [s.moduleCode, s.enabled]));

        this.modules.update((current) =>
          current.map((module) =>
            overrides.has(module.code)
              ? { ...module, enabled: overrides.get(module.code)! }
              : module,
          ),
        );
      },
      error: () => undefined,
    });
  }

  protected saveProfile(): void {
    if (this.savingProfile()) return;

    this.savingProfile.set(true);
    this.profileError.set(null);
    this.profileSaved.set(false);

    this.authApi.updateProfile(this.name()).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.profileSaved.set(true);
        this.currentUserService.setName(this.name());
        setTimeout(() => this.profileSaved.set(false), 2000);
      },
      error: (error) => {
        this.savingProfile.set(false);
        this.profileError.set(error?.error?.message ?? 'Unable to update profile.');
      },
    });
  }

  protected scrollToSection(id: string): void {
    this.activeSection.set(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // No-op — avatar upload requires a real backend endpoint that doesn't exist yet.
  protected changeAvatar(): void {
    // Intentionally does nothing.
  }

  protected toggleModule(code: string): void {
    const current = this.modules().find((m) => m.code === code);
    if (!current) return;

    this.setModuleEnabled(code, !current.enabled);
  }

  // "Set up" mimics running a module's first-time setup by enabling it. Seeding
  // module-specific defaults (default views/statuses etc) is out of scope here -
  // this only persists the on/off flag.
  protected setUpModule(code: string): void {
    this.setModuleEnabled(code, true);
  }

  private setModuleEnabled(code: string, enabled: boolean): void {
    this.modulesError.set(null);

    this.coreApi.setModuleEnabled(code, enabled).subscribe({
      next: () => {
        this.modules.update((current) =>
          current.map((module) => (module.code === code ? { ...module, enabled } : module)),
        );
      },
      error: (error) => {
        this.modulesError.set(error?.error?.message ?? 'Unable to update module.');
      },
    });
  }

  protected openDeleteAccountDialog(): void {
    this.deleteAccountDialogVisible.set(true);
  }
}
