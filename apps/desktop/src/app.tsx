import { Briefcase, Calendar as CalendarIcon, ChartNoAxesCombined, Dumbbell, Home as HomeIcon, ListChecks, ListTodo, Mail, Settings, ShieldCheck, StickyNote, Swords, Target, Trophy, Wallet, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnalyticsScreen } from './screens/analytics';
import { CalendarScreen } from './screens/calendar';
import { GoalsScreen } from './screens/goals';
import { HabitsScreen } from './screens/habits';
import { NotesScreen } from './screens/notes';
import { EmailScreen } from './screens/email';
import { VaultScreen } from './screens/vault';
import { WorkoutsScreen } from './screens/workouts';
import { HomeScreen } from './screens/home';
import { JobsScreen } from './screens/jobs';
import { FinanceScreen } from './screens/finance';
import { LoginScreen } from './screens/login';
import { QuestsScreen } from './screens/quests';
import { SettingsScreen } from './screens/settings';
import { TasksScreen } from './screens/tasks';
import { TrophiesScreen } from './screens/trophies';
import { NavContext } from './lib/nav';
import { LockScreen } from './lock-screen';
import { LockProvider, useLock } from './lib/lock';
import { QuickCapture } from './quick-capture';
import { SessionProvider, useSession } from './lib/session';
import { NotificationBell } from './modules/notifications';
import { PlayerBar } from './player-bar';

const SCREENS = [
  { id: 'home', label: 'Command', Icon: HomeIcon, View: HomeScreen },
  { id: 'quests', label: 'Quests', Icon: Swords, View: QuestsScreen },
  { id: 'email', label: 'Email', Icon: Mail, View: EmailScreen },
  { id: 'tasks', label: 'Tasks', Icon: ListTodo, View: TasksScreen },
  { id: 'habits', label: 'Habits', Icon: ListChecks, View: HabitsScreen },
  { id: 'goals', label: 'Goals', Icon: Target, View: GoalsScreen },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon, View: CalendarScreen },
  { id: 'notes', label: 'Notes', Icon: StickyNote, View: NotesScreen },
  { id: 'vault', label: 'Password Manager', Icon: ShieldCheck, View: VaultScreen },
  { id: 'workouts', label: 'Workouts', Icon: Dumbbell, View: WorkoutsScreen },
  { id: 'jobs', label: 'Jobs', Icon: Briefcase, View: JobsScreen },
  { id: 'finance', label: 'Finance', Icon: Wallet, View: FinanceScreen },
  { id: 'analytics', label: 'Analytics', Icon: ChartNoAxesCombined, View: AnalyticsScreen },
  { id: 'trophies', label: 'Trophies', Icon: Trophy, View: TrophiesScreen },
  { id: 'settings', label: 'Settings', Icon: Settings, View: SettingsScreen },
] as const satisfies readonly { id: string; label: string; Icon: LucideIcon; View: () => React.ReactNode }[];

type ScreenId = (typeof SCREENS)[number]['id'];

function Shell() {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [capturing, setCapturing] = useState(false);
  // Bumped after a capture so every screen refetches what the capture may have created.
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCapturing(true);
      }
      if ((event.metaKey || event.ctrlKey) && /^[1-9]$/.test(event.key)) {
        event.preventDefault();
        setScreen(SCREENS[Number(event.key) - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);

    // The tray menu and the global shortcut both emit this from the Rust side.
    let unlisten: (() => void) | undefined;
    if ('__TAURI_INTERNALS__' in window) {
      void import('@tauri-apps/api/event').then(({ listen }) => listen('quick-capture', () => setCapturing(true)).then((off) => (unlisten = off)));
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      unlisten?.();
    };
  }, []);

  const Active = SCREENS.find((s) => s.id === screen)!.View;

  return (
    <div className="shell">
      <nav className="rail">
        <div className="brand">Life_OS</div>
        <div className="rail-group">Modules</div>
        {SCREENS.map((s, i) => (
          <button key={s.id} className={`rail-item${s.id === screen ? ' active' : ''}`} onClick={() => setScreen(s.id)} title={`⌘${i + 1}`}>
            <span className="glyph"><s.Icon /></span>
            {s.label}
          </button>
        ))}
        <button className="capture-btn" onClick={() => setCapturing(true)}>
          + Quick capture <kbd>⌘K</kbd>
        </button>
      </nav>
      <main className="main">
        <header className="topbar">
          <span className="crumb"><b>~/</b>{screen === 'home' ? 'home' : screen}</span>
          <PlayerBar key={`bar-${epoch}`} />
          <NotificationBell />
        </header>
        <div className="content" key={`${screen}-${epoch}`}>
          <NavContext.Provider value={(id) => SCREENS.some((x) => x.id === id) && setScreen(id as ScreenId)}>
            <Active />
          </NavContext.Provider>
        </div>
      </main>
      {capturing && (
        <QuickCapture
          onClose={() => setCapturing(false)}
          onDone={() => {
            setCapturing(false);
            setEpoch((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

function Locked() {
  const { ready, locked } = useLock();
  if (!ready) return <div className="splash">Connecting…</div>;
  return locked ? <LockScreen /> : <Shell />;
}

function Gate() {
  const { signedIn, runtime } = useSession();
  if (!runtime) return <div className="splash">Connecting…</div>;
  return signedIn ? <LockProvider signedIn><Locked /></LockProvider> : <LoginScreen />;
}

export function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  );
}
