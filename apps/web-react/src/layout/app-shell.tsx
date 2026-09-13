import { Briefcase, Home as HomeIcon, LogOut, Settings } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

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
];

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <span className="px-2 py-1 text-sm font-semibold tracking-tight">Life OS</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Modules</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    {item.enabled ? (
                      <SidebarMenuButton asChild tooltip={item.label}>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            isActive ? 'font-medium text-sidebar-accent-foreground' : undefined
                          }
                        >
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
              <SidebarMenuButton asChild tooltip="Settings">
                <NavLink to="/settings">
                  <Settings />
                  <span>Settings</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => void logout()} tooltip="Log out">
                <LogOut />
                <span>{user?.email ?? 'Log out'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
