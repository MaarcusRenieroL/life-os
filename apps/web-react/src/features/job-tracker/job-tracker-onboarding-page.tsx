import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DatePicker } from '@/components/date-time-picker';
import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { careerProfileApi } from './career-profile-api';

type Mode = 'choose' | 'upload' | 'manual';

interface ExperienceDraft {
  title: string;
  company: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  current: boolean;
  bulletsText: string;
}

interface ProjectDraft {
  name: string;
  description: string;
  techStackText: string;
  link: string;
  startDate: string | null;
  endDate: string | null;
  bulletsText: string;
}

const emptyExperience: ExperienceDraft = {
  title: '',
  company: '',
  location: '',
  startDate: null,
  endDate: null,
  current: false,
  bulletsText: '',
};

const emptyProject: ProjectDraft = {
  name: '',
  description: '',
  techStackText: '',
  link: '',
  startDate: null,
  endDate: null,
  bulletsText: '',
};

function linesOf(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function JobTrackerOnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('choose');

  // Upload path
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      await careerProfileApi.seedFromResume(file);
      await queryClient.invalidateQueries({ queryKey: ['career-profile'] });
      toast.success('Career profile imported from your resume');
      navigate('/jobs');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Could not read that resume';
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  }

  // Manual path
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [experiences, setExperiences] = useState<ExperienceDraft[]>([{ ...emptyExperience }]);
  const [projects, setProjects] = useState<ProjectDraft[]>([{ ...emptyProject }]);
  const [saving, setSaving] = useState(false);
  const [manualError, setManualError] = useState('');

  function updateExperience(index: number, patch: Partial<ExperienceDraft>) {
    setExperiences((current) => current.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function updateProject(index: number, patch: Partial<ProjectDraft>) {
    setProjects((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  async function submitManual() {
    if (!fullName.trim()) {
      setManualError('Enter your full name first.');
      return;
    }
    setSaving(true);
    setManualError('');
    try {
      await careerProfileApi.upsertProfile({
        fullName: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        location: location.trim() || null,
        githubUrl: githubUrl.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        portfolioUrl: portfolioUrl.trim() || null,
        summary: summary.trim() || null,
      });

      const realExperiences = experiences.filter((e) => e.title.trim() && e.company.trim());
      for (let i = 0; i < realExperiences.length; i++) {
        const e = realExperiences[i];
        await careerProfileApi.createExperience({
          title: e.title.trim(),
          company: e.company.trim(),
          location: e.location.trim() || null,
          startDate: e.startDate,
          endDate: e.current ? null : e.endDate,
          current: e.current,
          bullets: linesOf(e.bulletsText),
          displayOrder: i,
        });
      }

      const realProjects = projects.filter((p) => p.name.trim());
      for (let i = 0; i < realProjects.length; i++) {
        const p = realProjects[i];
        await careerProfileApi.createProject({
          name: p.name.trim(),
          description: p.description.trim() || null,
          techStack: p.techStackText
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          link: p.link.trim() || null,
          startDate: p.startDate,
          endDate: p.endDate,
          bullets: linesOf(p.bulletsText),
          displayOrder: i,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['career-profile'] });
      toast.success('Career profile saved');
      navigate('/jobs');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Could not save your profile';
      setManualError(message);
    } finally {
      setSaving(false);
    }
  }

  if (mode === 'choose') {
    return (
      <div className="mx-auto max-w-xl py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your career profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is what every tailored resume gets built from - your work history, projects, and
          skills. Do it once now.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="cursor-pointer transition hover:border-primary/40" onClick={() => setMode('upload')}>
            <CardContent className="p-5">
              <h2 className="font-medium">Upload a resume</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll read it and fill in your experience, projects, and skills for you to review.
              </p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer transition hover:border-primary/40" onClick={() => setMode('manual')}>
            <CardContent className="p-5">
              <h2 className="font-medium">Enter it manually</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Type in your contact info, work experience, and projects yourself.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (mode === 'upload') {
    return (
      <div className="mx-auto max-w-xl py-12">
        <Button variant="ghost" size="sm" onClick={() => setMode('choose')}>
          ← Back
        </Button>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Upload your resume</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          PDF only. You'll be able to review and edit everything it pulls out before you go
          further.
        </p>
        <Button asChild className="mt-5" disabled={uploading}>
          <label className="cursor-pointer">
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => void onFile(e)}
            />
            {uploading ? 'Reading resume…' : 'Choose PDF'}
          </label>
        </Button>
        {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <Button variant="ghost" size="sm" onClick={() => setMode('choose')}>
        ← Back
      </Button>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Enter your career profile</h1>

      <section className="mt-6">
        <SectionHeading>contact & summary</SectionHeading>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>GitHub URL</Label>
            <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>LinkedIn URL</Label>
            <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label>Portfolio / site URL</Label>
            <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label>Summary</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-1" rows={3} />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <SectionHeading>work experience</SectionHeading>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExperiences((current) => [...current, { ...emptyExperience }])}
          >
            Add role
          </Button>
        </div>
        {experiences.map((e, i) => (
          <Card key={i} className="mt-3">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              <Input
                placeholder="Title"
                value={e.title}
                onChange={(ev) => updateExperience(i, { title: ev.target.value })}
              />
              <Input
                placeholder="Company"
                value={e.company}
                onChange={(ev) => updateExperience(i, { company: ev.target.value })}
              />
              <Input
                placeholder="Location"
                value={e.location}
                onChange={(ev) => updateExperience(i, { location: ev.target.value })}
                className="sm:col-span-2"
              />
              <DatePicker value={e.startDate} onChange={(v) => updateExperience(i, { startDate: v })} placeholder="Start date" />
              {!e.current && (
                <DatePicker value={e.endDate} onChange={(v) => updateExperience(i, { endDate: v })} placeholder="End date" />
              )}
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox checked={e.current} onCheckedChange={(v) => updateExperience(i, { current: v === true })} />
                I currently work here
              </label>
              <Textarea
                placeholder="Bullets, one per line"
                value={e.bulletsText}
                onChange={(ev) => updateExperience(i, { bulletsText: ev.target.value })}
                className="sm:col-span-2"
                rows={4}
              />
              <Button
                variant="ghost"
                size="sm"
                className="justify-self-start text-destructive sm:col-span-2"
                onClick={() => setExperiences((current) => current.filter((_, idx) => idx !== i))}
              >
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <SectionHeading>projects</SectionHeading>
          <Button variant="outline" size="sm" onClick={() => setProjects((current) => [...current, { ...emptyProject }])}>
            Add project
          </Button>
        </div>
        {projects.map((p, i) => (
          <Card key={i} className="mt-3">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              <Input placeholder="Name" value={p.name} onChange={(ev) => updateProject(i, { name: ev.target.value })} />
              <Input placeholder="Link (GitHub, live site, ...)" value={p.link} onChange={(ev) => updateProject(i, { link: ev.target.value })} />
              <Input
                placeholder="Tech stack, comma separated"
                value={p.techStackText}
                onChange={(ev) => updateProject(i, { techStackText: ev.target.value })}
                className="sm:col-span-2"
              />
              <DatePicker value={p.startDate} onChange={(v) => updateProject(i, { startDate: v })} placeholder="Start date" />
              <DatePicker value={p.endDate} onChange={(v) => updateProject(i, { endDate: v })} placeholder="End date" />
              <Textarea
                placeholder="Short description"
                value={p.description}
                onChange={(ev) => updateProject(i, { description: ev.target.value })}
                className="sm:col-span-2"
                rows={2}
              />
              <Textarea
                placeholder="Bullets, one per line"
                value={p.bulletsText}
                onChange={(ev) => updateProject(i, { bulletsText: ev.target.value })}
                className="sm:col-span-2"
                rows={3}
              />
              <Button
                variant="ghost"
                size="sm"
                className="justify-self-start text-destructive sm:col-span-2"
                onClick={() => setProjects((current) => current.filter((_, idx) => idx !== i))}
              >
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      {manualError && <p className="mt-4 text-sm text-destructive">{manualError}</p>}
      <Button className="mt-6" onClick={() => void submitManual()} disabled={saving}>
        {saving ? 'Saving…' : 'Finish'}
      </Button>
    </div>
  );
}
