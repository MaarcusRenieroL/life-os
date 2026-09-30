import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ChevronsUpDown,
  LogOut,
  Settings,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { ShortcutsHelpDialog } from '@/components/shortcuts-help-dialog';
import { useAuth } from '@/features/auth/auth-context';
import { emailHubApi } from '@/features/email-hub/email-hub-api';
import { AchievementWatcher } from '@/features/player/achievement-watcher';
import { LevelUpBanner } from '@/features/player/level-up';
import { PlayerChip } from '@/features/player/player-chip';
import { SidebarPlayer } from '@/features/player/sidebar-player';
import { SoundToggle } from '@/features/player/sound-toggle';
import { NAV_ITEMS } from '@/layout/nav-items';
import { NotificationBell } from '@/features/core/notification-bell';
import { QuickCaptureDialog } from '@/features/core/quick-capture-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';


/** The breadcrumb mirrors the real URL, not a made-up label, so it never drifts from the address bar. */
function currentPathSegment(pathname: string): string {
  return pathname.split('/').filter(Boolean)[0] ?? 'home';
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  // Emails the hub wants a yes on - shown as a badge so they aren't missed.
  const { data: emailPending = 0 } = useQuery({
    queryKey: ['email-hub', 'pending-count'],
    queryFn: emailHubApi.pendingCount,
    refetchInterval: 120_000,
    retry: false,
  });

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="text-primary text-glow">◆</span>
            <span className="font-display text-sm font-bold tracking-[0.3em] uppercase group-data-[collapsible=icon]:hidden">
              Life_OS
            </span>
          </div>
        </SidebarHeader>
        <SidebarPlayer />
        <SidebarSeparator className="mx-0 mt-2" />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] tracking-widest uppercase">Modules</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => {
                  const isActive = location.pathname.startsWith(item.to);
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <NavLink to={item.to}>
                          <item.icon className={isActive ? 'text-primary' : undefined} />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                      {item.to === '/email' && emailPending > 0 && <SidebarMenuBadge>{emailPending}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator className="mx-0" />
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname.startsWith('/settings')}
                tooltip="Settings"
              >
                <NavLink to="/settings">
                  <Settings />
                  <span>Settings</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton tooltip={user?.email ?? 'Account'}>
                    <span className="flex size-4 items-center justify-center rounded-sm bg-primary/15 text-[9px] font-semibold text-primary">
                      {(user?.email ?? '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate">{user?.email ?? 'Account'}</span>
                    <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuLabel className="font-normal text-muted-foreground">
                    Signed in as
                    <div className="truncate font-medium text-foreground">{user?.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(event) => {
                      event.preventDefault();
                      setLogoutConfirmOpen(true);
                    }}
                  >
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <div className="h-4 w-px bg-border" />
          <span className="font-mono text-xs tracking-wide text-muted-foreground">
            <span className="text-primary">~/</span>
            {currentPathSegment(location.pathname)}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <PlayerChip />
            <SoundToggle />
            <QuickCaptureDialog />
            <NotificationBell />
          </div>
        </header>
        <main className="hud-bg flex-1 p-4 sm:p-6">
          {/* Keyed on the path so every navigation fades in instead of snapping. */}
          <div key={location.pathname} className="animate-hud-in">
            <Outlet />
          </div>
        </main>
      </SidebarInset>

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of Life OS?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to get back to your modules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                setLogoutConfirmOpen(false);
                void logout();
              }}
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ShortcutsHelpDialog />
      <LevelUpBanner />
      <AchievementWatcher />
    </SidebarProvider>
  );
}
