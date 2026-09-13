import { Briefcase, Home as HomeIcon, LogOut, Settings, ShieldCheck, StickyNote, Wallet } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/auth-context';
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
  { label: 'Home', to: '/home', icon: HomeIcon, enabled: true },
  { label: 'Job Tracker', to: '/jobs', icon: Briefcase, enabled: true },
  { label: 'Notes', to: '/notes', icon: StickyNote, enabled: true },
  { label: 'Vault', to: '/vault', icon: ShieldCheck, enabled: true },
  { label: 'Finance', to: '/finance', icon: Wallet, enabled: true },
];

function currentModuleLabel(pathname: string): string {
  const match = NAV_ITEMS.find((item) => pathname.startsWith(item.to));
  if (match) return match.label;
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'Life OS';
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="text-primary">■</span>
            <span className="text-sm font-semibold tracking-widest uppercase">Life_OS</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] tracking-widest uppercase">Modules</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    {item.enabled ? (
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname.startsWith(item.to)}
                        tooltip={item.label}
                      >
                        <NavLink to={item.to}>
                          <item.icon />
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
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
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
              <SidebarMenuButton onClick={() => void logout()} tooltip="Log out">
                <LogOut />
                <span className="truncate">{user?.email ?? 'Log out'}</span>
              </SidebarMenuButton>
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
            {currentModuleLabel(location.pathname).toLowerCase().replace(/\s+/g, '-')}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
