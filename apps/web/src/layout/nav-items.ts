import {
  Briefcase,
  Calendar as CalendarIcon,
  CalendarCheck,
  ChartNoAxesCombined,
  Dumbbell,
  Home as HomeIcon,
  ListChecks,
  ListTodo,
  Mail,
  ShieldCheck,
  StickyNote,
  Target,
  Trophy,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

/** Every module in the app, in sidebar order. The Home page reuses these as its "portals". */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Today', to: '/today', icon: CalendarCheck },
  { label: 'Home', to: '/home', icon: HomeIcon },
  { label: 'Email', to: '/email', icon: Mail },
  { label: 'Tasks', to: '/tasks', icon: ListTodo },
  { label: 'Calendar', to: '/calendar', icon: CalendarIcon },
  { label: 'Job Tracker', to: '/jobs', icon: Briefcase },
  { label: 'Notes', to: '/notes', icon: StickyNote },
  { label: 'Password Manager', to: '/vault', icon: ShieldCheck },
  { label: 'Finance', to: '/finance', icon: Wallet },
  { label: 'Habits', to: '/habits', icon: ListChecks },
  { label: 'Goals', to: '/goals', icon: Target },
  { label: 'Workouts', to: '/workouts', icon: Dumbbell },
  { label: 'Trophies', to: '/achievements', icon: Trophy },
  { label: 'Analytics', to: '/analytics', icon: ChartNoAxesCombined },
];
