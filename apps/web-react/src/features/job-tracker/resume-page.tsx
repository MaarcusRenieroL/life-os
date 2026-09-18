import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { SectionHeading } from '@/components/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { careerProfileApi } from './career-profile-api';
import { CareerProfileDialog } from './career-profile-dialog';
import { ExperienceDialog } from './experience-dialog';
import { ProjectDialog } from './project-dialog';
import type { ProjectEntry, WorkExperience } from './types';

function formatRange(startDate: string | null, endDate: string | null, current: boolean): string {
  const start = startDate ?? '?';
  const end = current ? 'Present' : (endDate ?? '?');
  return `${start} to ${end}`;
}

export function ResumePage() {
  const queryClient = useQueryClient();
  const { data: bundle } = useQuery({ queryKey: ['career-profile'], queryFn: careerProfileApi.get });

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [experienceDialog, setExperienceDialog] = useState<{ open: boolean; editing: WorkExperience | null }>({
    open: false,
    editing: null,
  });
  const [projectDialog, setProjectDialog] = useState<{ open: boolean; editing: ProjectEntry | null }>({
    open: false,
    editing: null,
  });
  const [reuploading, setReuploading] = useState(false);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['career-profile'] });
  }

  function pickResumeFile() {
    if (!confirm('This replaces your work experience, projects, education, and achievements with what this PDF parses to. Skills merge instead of replacing. Continue?')) {
      return;
    }
    resumeFileInputRef.current?.click();
  }

  async function onResumeFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setReuploading(true);
    try {
      await careerProfileApi.seedFromResume(file);
      refresh();
      toast.success('Career profile re-synced from resume');
    } catch {
      toast.error('Could not read that resume PDF');
    } finally {
      setReuploading(false);
    }
  }

  async function removeExperience(id: string) {
    await careerProfileApi.deleteExperience(id);
    refresh();
    toast.success('Removed');
  }

  async function removeProject(id: string) {
    await careerProfileApi.deleteProject(id);
    refresh();
    toast.success('Removed');
  }

  if (!bundle) return null;

  const { profile, experiences, projects, skills } = bundle;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Career Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This is what every tailored resume gets built from. Keep it current.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={resumeFileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => void onResumeFileChosen(e)}
          />
          <Button variant="outline" size="sm" onClick={pickResumeFile} disabled={reuploading}>
            {reuploading ? 'Syncing…' : 'Re-upload resume'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setProfileDialogOpen(true)}>
            Edit contact & summary
          </Button>
        </div>
      </div>

      <section className="mt-6">
        <SectionHeading>contact</SectionHeading>
        <Card className="mt-2">
          <CardContent className="p-4 text-sm">
            <p className="font-medium">{profile?.fullName || 'Add your name'}</p>
            <p className="mt-1 text-muted-foreground">
              {[profile?.email, profile?.phone, profile?.location].filter(Boolean).join(' · ') || '—'}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-3 text-muted-foreground">
              {profile?.githubUrl && <a href={profile.githubUrl} className="hover:underline">GitHub</a>}
              {profile?.linkedinUrl && <a href={profile.linkedinUrl} className="hover:underline">LinkedIn</a>}
              {profile?.portfolioUrl && <a href={profile.portfolioUrl} className="hover:underline">Portfolio</a>}
            </p>
            {profile?.summary && <p className="mt-3">{profile.summary}</p>}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <SectionHeading>work experience</SectionHeading>
          <Button variant="outline" size="sm" onClick={() => setExperienceDialog({ open: true, editing: null })}>
            Add
          </Button>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {experiences.length === 0 && <p className="text-sm text-muted-foreground">Nothing added yet.</p>}
          {experiences.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {e.title} <span className="text-muted-foreground">at {e.company}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.location ? `${e.location} · ` : ''}
                      {formatRange(e.startDate, e.endDate, e.current)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setExperienceDialog({ open: true, editing: e })}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => void removeExperience(e.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
                {e.bullets && e.bullets.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-4">
                    {e.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <SectionHeading>projects</SectionHeading>
          <Button variant="outline" size="sm" onClick={() => setProjectDialog({ open: true, editing: null })}>
            Add
          </Button>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {projects.length === 0 && <p className="text-sm text-muted-foreground">Nothing added yet.</p>}
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {p.link ? (
                        <a href={p.link} className="hover:underline">
                          {p.name}
                        </a>
                      ) : (
                        p.name
                      )}
                    </p>
                    {p.techStack && p.techStack.length > 0 && (
                      <p className="text-xs text-muted-foreground">{p.techStack.join(', ')}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setProjectDialog({ open: true, editing: p })}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => void removeProject(p.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
                {p.description && <p className="mt-2">{p.description}</p>}
                {p.bullets && p.bullets.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-4">
                    {p.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {profile?.education && profile.education.length > 0 && (
        <section className="mt-6">
          <SectionHeading>education</SectionHeading>
          <div className="mt-2 flex flex-col gap-2">
            {profile.education.map((edu, i) => (
              <Card key={i}>
                <CardContent className="p-4 text-sm">
                  <p className="font-medium">{edu.school}</p>
                  <p className="text-xs text-muted-foreground">
                    {edu.degree}
                    {edu.location ? ` · ${edu.location}` : ''}
                    {edu.dates ? ` · ${edu.dates}` : ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {profile?.achievements && profile.achievements.length > 0 && (
        <section className="mt-6">
          <SectionHeading>achievements</SectionHeading>
          <Card className="mt-2">
            <CardContent className="p-4 text-sm">
              <ul className="list-disc space-y-1 pl-4">
                {profile.achievements.map((achievement, i) => (
                  <li key={i}>{achievement}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="mt-6">
        <SectionHeading>skills ({skills.length})</SectionHeading>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <Badge key={skill.id} variant="secondary">
              {skill.name}
              <span className="text-muted-foreground"> · {skill.proficiency}</span>
            </Badge>
          ))}
        </div>
      </section>

      <CareerProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} profile={profile} onSaved={refresh} />
      <ExperienceDialog
        open={experienceDialog.open}
        onOpenChange={(open) => setExperienceDialog((s) => ({ ...s, open }))}
        editing={experienceDialog.editing}
        nextDisplayOrder={experiences.length}
        onSaved={refresh}
      />
      <ProjectDialog
        open={projectDialog.open}
        onOpenChange={(open) => setProjectDialog((s) => ({ ...s, open }))}
        editing={projectDialog.editing}
        nextDisplayOrder={projects.length}
        onSaved={refresh}
      />
    </div>
  );
}
