import { useState } from 'react';
import {
  Briefcase,
  CalendarCheck,
  ChevronsUpDown,
  Home as HomeIcon,
  ListChecks,
  LogOut,
  Settings,
  ShieldCheck,
  StickyNote,
  Wallet,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/auth-context';
import { NotificationBell } from '@/features/core/notification-bell';
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';

interface NavItem {
  label: string;
  to: string;
  icon: typeof HomeIcon;
  /** Modules not ported to React yet render a disabled, greyed-out entry. */
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Today', to: '/today', icon: CalendarCheck, enabled: true },
  { label: 'Home', to: '/home', icon: HomeIcon, enabled: true },
  { label: 'Job Tracker', to: '/jobs', icon: Briefcase, enabled: true },
  { label: 'Notes', to: '/notes', icon: StickyNote, enabled: true },
  { label: 'Password Manager', to: '/vault', icon: ShieldCheck, enabled: true },
  { label: 'Finance', to: '/finance', icon: Wallet, enabled: true },
  { label: 'Habits', to: '/habits', icon: ListChecks, enabled: true },
];

/** The breadcrumb mirrors the real URL, not a made-up label, so it never drifts from the address bar. */
function currentPathSegment(pathname: string): string {
  return pathname.split('/').filter(Boolean)[0] ?? 'home';
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="text-primary">■</span>
            <span className="text-sm font-semibold tracking-widest uppercase group-data-[collapsible=icon]:hidden">
              Life_OS
            </span>
          </div>
        </SidebarHeader>
        <SidebarSeparator className="mx-0" />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] tracking-widest uppercase">Modules</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => {
                  const isActive = location.pathname.startsWith(item.to);
                  return (
                    <SidebarMenuItem key={item.to}>
                      {item.enabled ? (
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                          <NavLink to={item.to}>
                            <item.icon className={isActive ? 'text-primary' : undefined} />
                            <span>{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton disabled tooltip={`${item.label} - coming soon`}>
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      )}
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
        <header className="flex h-12 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <div className="h-4 w-px bg-border" />
          <span className="font-mono text-xs tracking-wide text-muted-foreground">
            <span className="text-primary">~/</span>
            {currentPathSegment(location.pathname)}
          </span>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
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
    </SidebarProvider>
  );
}
