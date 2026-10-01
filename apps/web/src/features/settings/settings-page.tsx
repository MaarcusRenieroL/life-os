import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  LayoutGrid,
  Palette,
  Plug,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  User,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { APP_MODULES, type AppModuleConfig } from '@/config/app-modules';
import { authApi } from '@/features/auth/auth-api';
import { useAuth } from '@/features/auth/auth-context';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';

import { coreApi } from '../core/core-api';
import { DeleteAccountDialog } from './delete-account-dialog';
import { MODULE_SETUP } from '@/features/setup/module-setup';
import { useSetupState } from '@/features/setup/setup-state';
import { GmailConnections } from './gmail-connections';
import { SettingRow, SettingsSection, SoonBadge } from './settings-ui';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'modules', label: 'Modules', icon: LayoutGrid },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'data-privacy', label: 'Data & privacy', icon: ShieldCheck },
  { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
  { id: 'danger-zone', label: 'Danger zone', icon: AlertTriangle, danger: true },
];

type ThemePreference = 'terminal-dark' | 'light' | 'system';

// Light/System aren't implemented yet - the app currently has one committed visual theme (see
// the comment in src/index.css), not an actual toggle. Both options are listed but disabled so
// the selector honestly reflects what picking them would do (nothing) instead of implying a
// working theme switch that silently doesn't change anything.
const THEME_OPTIONS: { label: string; value: ThemePreference; disabled?: boolean }[] = [
  { label: 'Terminal dark (default)', value: 'terminal-dark' },
  { label: 'Light (coming soon)', value: 'light', disabled: true },
  { label: 'System (coming soon)', value: 'system', disabled: true },
];

function computeInitials(name: string, email: string): string {
  const source = (name || email).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function SettingsPage() {
  const { user, updateProfileName, refreshUser } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [name, setName] = useState(user?.name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>('terminal-dark');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // The profile may arrive after first render (deep link / reload), so follow it until edited.
  const [nameTouched, setNameTouched] = useState(false);
  const shownName = nameTouched ? name : (user?.name ?? '');

  useEffect(() => {
    if (!user?.hasAvatar) {
      setAvatarUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    authApi.getAvatarObjectUrl().then((url) => {
      objectUrl = url;
      setAvatarUrl(url);
    }).catch(() => setAvatarUrl(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user?.hasAvatar]);

  async function handleAvatarSelected(file: File | undefined) {
    if (!file) return;
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      await authApi.updateAvatar(file);
      await refreshUser();
    } catch (err) {
      setAvatarError(getErrorMessage(err, 'Could not update avatar.'));
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }
  const suppressSpyRef = useRef(false);

  // Scroll-spy: highlight whichever section is currently at the top of the
  // viewport so the nav stays in sync while the user scrolls, not just on click.
  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressSpyRef.current) return;
        const topMost = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (topMost) {
          setActiveSection(topMost.target.id);
        }
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const { data: overrides } = useQuery({
    queryKey: ['core', 'modules'],
    queryFn: coreApi.getModuleSettings,
    staleTime: 5 * 60_000,
  });
  const [localOverrides, setLocalOverrides] = useState<Map<string, boolean> | null>(null);
  const overrideMap = localOverrides ?? new Map((overrides ?? []).map((s) => [s.moduleCode, s.enabled]));

  const modules: AppModuleConfig[] = APP_MODULES.map((module) =>
    overrideMap.has(module.code) ? { ...module, enabled: overrideMap.get(module.code)! } : module,
  );

  const [modulesError, setModulesError] = useState<string | null>(null);
  const setupState = useSetupState();

  async function setModuleEnabled(code: string, enabled: boolean) {
    setModulesError(null);
    try {
      await coreApi.setModuleEnabled(code, enabled);
      setLocalOverrides(new Map(overrideMap).set(code, enabled));
    } catch (err) {
      setModulesError(getErrorMessage(err, 'Unable to update module.'));
    }
  }

  async function saveProfile() {
    if (savingProfile) return;
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await updateProfileName(name);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setProfileError(getErrorMessage(err, 'Unable to update profile.'));
    } finally {
      setSavingProfile(false);
    }
  }

  function scrollTo(id: string) {
    setActiveSection(id);
    // Ignore the scroll-spy while the smooth scroll is in flight so it doesn't
    // fight with (and flicker away from) the section the user just clicked.
    suppressSpyRef.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      suppressSpyRef.current = false;
    }, 700);
  }

  const initials = user ? computeInitials(user.name ?? '', user.email) : '';

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link to="/home" className="text-foreground hover:text-primary">
          life-os
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="text-foreground/85">Settings</span>
      </div>

      <div className="mb-7">
        <h1 className="font-display text-2xl font-semibold tracking-wide">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your profile, which modules are on, and the accounts Life OS reads.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[210px_minmax(0,1fr)]">
        <nav className="flex flex-row gap-1 overflow-x-auto pb-1 md:sticky md:top-4 md:flex-col md:self-start md:overflow-visible md:pb-0">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                className={cn(
                  'relative flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm whitespace-nowrap transition-colors',
                  active ? 'bg-primary/10 font-medium text-foreground' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                  item.danger && (active ? 'bg-destructive/10 text-destructive' : 'text-destructive/80 hover:text-destructive'),
                )}
              >
                {active && <span className={cn('absolute inset-y-1.5 left-0 w-0.5 rounded-full', item.danger ? 'bg-destructive' : 'bg-primary')} />}
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-col gap-5">
          <SettingsSection id="profile" icon={User} title="Profile" description="How you appear across Life OS.">
            <div className="flex flex-wrap items-center gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="size-16 rounded-full border-2 border-primary/40 object-cover" />
              ) : (
                <div className="grid size-16 place-items-center rounded-full border-2 border-primary/40 bg-background font-display text-lg text-primary">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{user?.name || 'Unnamed player'}</p>
                <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => void handleAvatarSelected(e.target.files?.[0])}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>
                    {uploadingAvatar ? 'Uploading…' : 'Change avatar'}
                  </Button>
                  {user?.hasAvatar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={uploadingAvatar}
                      onClick={() => void authApi.deleteAvatar().then(() => refreshUser())}
                    >
                      Remove
                    </Button>
                  )}
                  {avatarError && <span className="text-xs text-destructive">{avatarError}</span>}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="settingsName" className="mb-1.5 block text-xs text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="settingsName"
                  value={shownName}
                  onChange={(e) => {
                    setNameTouched(true);
                    setName(e.target.value);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="settingsEmail" className="mb-1.5 block text-xs text-muted-foreground">
                  Email
                </Label>
                <Input id="settingsEmail" type="email" value={user?.email ?? ''} disabled />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              {profileSaved && <span className="text-xs text-primary">Saved</span>}
              {profileError && <span className="text-xs text-destructive">{profileError}</span>}
              <Button onClick={() => void saveProfile()} disabled={savingProfile || !shownName || shownName === (user?.name ?? '')}>
                {savingProfile ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </SettingsSection>

          <SettingsSection
            id="modules"
            icon={LayoutGrid}
            title="Modules"
            description={`${modules.filter((m) => m.enabled).length} of ${modules.length} switched on. Turn off what you don't use - it disappears from the sidebar and Home.`}
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/setup">Run setup</Link>
              </Button>
            }
          >
            {modulesError && <p className="mb-3 text-xs text-destructive">{modulesError}</p>}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => (
                <div
                  key={module.code}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-md border px-3.5 py-3 transition-colors',
                    module.enabled ? 'border-primary/25 bg-primary/[0.04]' : 'bg-muted/20 text-muted-foreground',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{module.name}</span>
                    {module.enabled && MODULE_SETUP[module.code] && (
                      <Link to={`/setup/${module.code}`} className="text-[11px] text-primary hover:underline">
                        {setupState.statusOf(module.code) === 'done' ? 'Review setup' : 'Set up'}
                      </Link>
                    )}
                  </span>
                  <Switch checked={module.enabled} onCheckedChange={(checked) => void setModuleEnabled(module.code, checked)} aria-label={`${module.enabled ? 'Turn off' : 'Turn on'} ${module.name}`} />
                </div>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection id="appearance" icon={Palette} title="Appearance" description="Colours and theme.">
            <SettingRow label="Theme" hint="Terminal dark is the only theme for now.">
              <Select value={theme} onValueChange={(v) => setTheme(v as ThemePreference)}>
                <SelectTrigger className="min-w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
          </SettingsSection>

          <SettingsSection id="notifications" icon={Bell} title="Notifications" description="How Life OS gets your attention.">
            <div className="flex flex-col gap-4">
              <SettingRow label="In-app notifications" hint="The bell, top right - live across every module.">
                <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-wider text-primary uppercase">
                  On
                </span>
              </SettingRow>
              <SettingRow label="Email and push" hint="Delivery outside the app, and per-type preferences.">
                <SoonBadge />
              </SettingRow>
            </div>
          </SettingsSection>

          <SettingsSection
            id="integrations"
            icon={Plug}
            title="Integrations"
            description="Connect the Gmail accounts Life OS reads - bank alerts and job emails can be different addresses."
          >
            <GmailConnections />
          </SettingsSection>

          <SettingsSection id="data-privacy" icon={ShieldCheck} title="Data & privacy" description="Your data stays on your own server.">
            <SettingRow label="Export, import and backup" hint="An account-wide version is planned; for now it lives in the Password Manager.">
              <Button asChild variant="outline" size="sm">
                <Link to="/vault/data">Open data management</Link>
              </Button>
            </SettingRow>
          </SettingsSection>

          <AdvancedSettingsSection />

          <SettingsSection
            id="danger-zone"
            icon={AlertTriangle}
            tone="danger"
            title="Danger zone"
            description="Permanently deletes your vault and account. This cannot be undone."
            action={
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete account
              </Button>
            }
          />
        </div>
      </div>

      <DeleteAccountDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} />
    </div>
  );
}

/** The "almost everything you can possibly think of" settings store - a generic module/key/value
 * editor over core's UserSettingController, collapsed by default. Progressive disclosure on
 * purpose: the daily-use surface above stays simple, this is for anyone who wants to reach past
 * it. Not every module reads every setting yet (that's rolled out per-feature as each one is
 * built), but everything stored here is real, persisted, and cached - not a mockup. */
function AdvancedSettingsSection() {
  const [expanded, setExpanded] = useState(false);
  const [module, setModule] = useState('');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['core', 'settings'],
    queryFn: coreApi.getSettings,
    enabled: expanded,
  });

  async function addSetting() {
    if (!module.trim() || !key.trim()) return;
    setError(null);
    try {
      await coreApi.setSetting(module.trim(), key.trim(), value);
      setModule('');
      setKey('');
      setValue('');
      void queryClient.invalidateQueries({ queryKey: ['core', 'settings'] });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save that setting.'));
    }
  }

  async function removeSetting(m: string, k: string) {
    try {
      await coreApi.deleteSetting(m, k);
      void queryClient.invalidateQueries({ queryKey: ['core', 'settings'] });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not remove that setting.'));
    }
  }

  return (
    <SettingsSection
      id="advanced"
      icon={SlidersHorizontal}
      title="Advanced"
      description="Raw module settings, for tuning things the screens above don't expose."
      action={
        <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? 'Hide' : 'Show'}
          <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
        </Button>
      }
    >
      {expanded && (
        <div>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Raw settings storage, keyed by module and name. Most people won't need this - it's
            here for tuning things the regular settings above don't expose yet.
          </p>

          {settings.length > 0 && (
            <div className="mb-3.5 flex flex-col gap-1.5">
              {settings.map((s) => (
                <div key={`${s.module}.${s.key}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                  <span className="font-mono text-muted-foreground">
                    {s.module}.{s.key} = <span className="text-foreground">{s.value ?? '—'}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={`Remove setting ${s.module}.${s.key}`}
                    onClick={() => void removeSetting(s.module, s.key)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="mb-1 block text-[10px] text-muted-foreground">MODULE</Label>
              <Input value={module} onChange={(e) => setModule(e.target.value)} placeholder="finance" className="h-8 w-28 text-xs" />
            </div>
            <div>
              <Label className="mb-1 block text-[10px] text-muted-foreground">KEY</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="budget-alert-threshold" className="h-8 w-48 text-xs" />
            </div>
            <div>
              <Label className="mb-1 block text-[10px] text-muted-foreground">VALUE</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.9" className="h-8 w-32 text-xs" />
            </div>
            <Button size="sm" className="h-8" onClick={() => void addSetting()} disabled={!module.trim() || !key.trim()}>
              Save
            </Button>
          </div>
          {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
        </div>
      )}
    </SettingsSection>
  );
}
