import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { APP_MODULES } from '../../config/app-modules';
import { CurrentUserService } from '../../services/current-user.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly currentUser = inject(CurrentUserService).user;

  protected readonly modules = APP_MODULES;

  private readonly routeData = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let child = this.route.firstChild;
        while (child?.firstChild) {
          child = child.firstChild;
        }
        return child?.snapshot?.data ?? {};
      }),
    ),
    { initialValue: {} as Record<string, unknown> },
  );

  protected readonly moduleCode = computed(() => (this.routeData()['module'] as string) ?? 'home');
  protected readonly activeModule = computed(() =>
    this.modules.find((m) => m.code === (this.moduleCode() === 'password-manager' ? 'PM' : '')),
  );
  protected readonly isHome = computed(() => this.moduleCode() === 'home');

  protected readonly switcherOpen = signal(false);
  protected readonly searchFocused = signal(false);
  protected readonly mobileMenuOpen = signal(false);

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchFocused.set(true);
      document.getElementById('app-shell-search')?.focus();
    }
  }

  closeSwitcher(): void {
    this.switcherOpen.set(false);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
