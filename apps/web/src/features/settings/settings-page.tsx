import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { SectionHeading } from '@/components/section-heading';
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

interface NavItem {
  id: string;
  label: string;
  danger?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'modules', label: 'Modules' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'data-privacy', label: 'Data & privacy' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'danger-zone', label: 'Danger zone', danger: true },
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

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-row gap-0.5 overflow-x-auto md:sticky md:top-0 md:flex-col md:self-start md:overflow-visible">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className={cn(
                'cursor-pointer whitespace-nowrap rounded-md bg-transparent px-3 py-2 text-left text-sm transition-colors',
                activeSection === item.id && !item.danger && 'bg-foreground/6 font-semibold',
                item.danger && 'text-destructive',
                !item.danger && activeSection !== item.id && 'text-muted-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-4">
          <section id="profile" className="rounded-lg border bg-card p-5">
            <SectionHeading className="mb-3.5">Profile</SectionHeading>

            <div className="mb-4 flex items-center gap-3.5">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full border object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-background text-sm text-primary">
                  {initials}
                </div>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => void handleAvatarSelected(e.target.files?.[0])}
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={uploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
              >
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
              {avatarError && <span className="text-[11px] text-destructive">{avatarError}</span>}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="settingsName" className="mb-1.5 block text-[11px] text-muted-foreground">
                  NAME
                </Label>
                <Input id="settingsName" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="settingsEmail" className="mb-1.5 block text-[11px] text-muted-foreground">
                  EMAIL
                </Label>
                <Input id="settingsEmail" type="email" value={user?.email ?? ''} disabled />
              </div>
            </div>

            <div className="mt-3.5 flex items-center gap-2.5">
              <Button onClick={() => void saveProfile()} disabled={savingProfile || !name}>
                {savingProfile ? 'Saving…' : 'Save'}
              </Button>
              {profileSaved && <span className="text-[11px] text-primary">Saved</span>}
              {profileError && <span className="text-[11px] text-destructive">{profileError}</span>}
            </div>
          </section>

          <section id="modules" className="rounded-lg border bg-card p-5">
            <SectionHeading className="mb-3.5">Modules</SectionHeading>
            {modulesError && <p className="mb-3 text-[11px] text-destructive">{modulesError}</p>}
            <div className="flex flex-col">
              {modules.map((module) => (
                <div key={module.code} className="flex items-center justify-between border-b py-2.5 last:border-b-0">
                  <span className="text-sm">{module.name}</span>
                  {module.enabled ? (
                    <Switch checked onCheckedChange={(checked) => void setModuleEnabled(module.code, checked)} />
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => void setModuleEnabled(module.code, true)}>
                      Set up
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section id="appearance" className="rounded-lg border bg-card p-5">
              <SectionHeading className="mb-3.5">Appearance</SectionHeading>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/75">Theme</span>
                <Select value={theme} onValueChange={(v) => setTheme(v as ThemePreference)}>
                  <SelectTrigger className="min-w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section id="notifications" className="rounded-lg border bg-card p-5">
              <SectionHeading className="mb-1.5">Notifications</SectionHeading>
              <div className="text-[11px] text-muted-foreground">
                In-app notifications (the bell, top right) are live across every module. Email
                and push delivery, and per-type preferences, are still on the roadmap.
              </div>
            </section>

            <section id="integrations" className="rounded-lg border bg-card p-5">
              <SectionHeading className="mb-1.5">Integrations</SectionHeading>
              <div className="text-[11px] text-muted-foreground">
                Connect third-party services (calendars, job boards, banks) once those integrations
                exist.
              </div>
            </section>

            <section id="data-privacy" className="rounded-lg border bg-card p-5">
              <SectionHeading className="mb-1.5">Data &amp; privacy</SectionHeading>
              <div className="text-[11px] text-muted-foreground">
                Export, import and backup live on the{' '}
                <Link to="/vault/data" className="text-primary hover:underline">
                  Password Manager's Data Management page
                </Link>{' '}
                for now — an account-wide version is planned.
              </div>
            </section>
          </div>

          <AdvancedSettingsSection />

          <section id="danger-zone" className="rounded-lg border border-destructive/35 bg-card p-5">
            <SectionHeading className="mb-1.5" tone="destructive">Danger zone</SectionHeading>
            <div className="mb-3.5 text-[11px] text-muted-foreground">
              Permanently deletes your vault and account. This cannot be undone.
            </div>
            <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialogOpen(true)}>
              Delete account
            </Button>
          </section>
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
    <section id="advanced" className="rounded-lg border bg-card p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <SectionHeading>Advanced</SectionHeading>
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="mt-3.5">
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
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => void removeSetting(s.module, s.key)}>
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
    </section>
  );
}
