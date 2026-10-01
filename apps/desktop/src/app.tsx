import { useEffect, useState } from 'react';
import { HabitsScreen } from './screens/habits';
import { HomeScreen } from './screens/home';
import { JobsScreen } from './screens/jobs';
import { FinanceScreen } from './screens/finance';
import { LoginScreen } from './screens/login';
import { QuestsScreen } from './screens/quests';
import { SettingsScreen } from './screens/settings';
import { TasksScreen } from './screens/tasks';
import { TrophiesScreen } from './screens/trophies';
import { QuickCapture } from './quick-capture';
import { SessionProvider, useSession } from './lib/session';
import { PlayerBar } from './player-bar';

const SCREENS = [
  { id: 'home', label: 'Command', glyph: '◈', View: HomeScreen },
  { id: 'quests', label: 'Quests', glyph: '⚔', View: QuestsScreen },
  { id: 'tasks', label: 'Tasks', glyph: '☑', View: TasksScreen },
  { id: 'habits', label: 'Habits', glyph: '↻', View: HabitsScreen },
  { id: 'jobs', label: 'Jobs', glyph: '✦', View: JobsScreen },
  { id: 'finance', label: 'Finance', glyph: '₹', View: FinanceScreen },
  { id: 'trophies', label: 'Trophies', glyph: '★', View: TrophiesScreen },
  { id: 'settings', label: 'Settings', glyph: '⚙', View: SettingsScreen },
] as const;

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
      if ((event.metaKey || event.ctrlKey) && /^[1-8]$/.test(event.key)) {
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
        <div className="brand">LIFE<span>OS</span></div>
        {SCREENS.map((s, i) => (
          <button key={s.id} className={`rail-item${s.id === screen ? ' active' : ''}`} onClick={() => setScreen(s.id)} title={`⌘${i + 1}`}>
            <span className="glyph">{s.glyph}</span>
            {s.label}
          </button>
        ))}
        <button className="capture-btn" onClick={() => setCapturing(true)}>
          + Quick capture <kbd>⌘K</kbd>
        </button>
      </nav>
      <main className="main">
        <PlayerBar key={`bar-${epoch}`} />
        <div className="content" key={`${screen}-${epoch}`}>
          <Active />
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

function Gate() {
  const { signedIn, runtime } = useSession();
  if (!runtime) return <div className="splash">Connecting…</div>;
  return signedIn ? <Shell /> : <LoginScreen />;
}

export function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  );
}
