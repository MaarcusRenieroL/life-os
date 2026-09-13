import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { SectionHeading } from '@/components/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { resumeApi } from './resume-api';

function statusLabel(status: string | null): string {
  switch (status) {
    case 'COMPLETED':
      return 'parsed';
    case 'PROCESSING':
      return 'parsing…';
    case 'FAILED':
      return 'stored, not auto-parsed';
    default:
      return (status ?? 'pending').toLowerCase();
  }
}

export function ResumePage() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: resume } = useQuery({ queryKey: ['resume'], queryFn: resumeApi.current });
  const { data: skills = [] } = useQuery({ queryKey: ['skills'], queryFn: resumeApi.skillLibrary });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setNote('');
    try {
      const uploaded = await resumeApi.upload(file, file.name);
      if (uploaded.extractionStatus === 'FAILED') {
        setNote('Uploaded. ' + (uploaded.extractionError ?? 'Text could not be auto-extracted.'));
      }
      await queryClient.invalidateQueries({ queryKey: ['resume'] });
      await queryClient.invalidateQueries({ queryKey: ['skills'] });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Upload failed';
      setError(message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Resume</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a PDF. Its skills are extracted and used to score every job you add. Uploading a new
        one replaces the old.
      </p>

      <Button asChild variant="outline" className="mt-4">
        <label className="cursor-pointer">
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => void onFile(e)}
          />
          {uploading ? 'Uploading…' : resume ? 'Replace resume PDF' : 'Upload resume PDF'}
        </label>
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}

      <section className="mt-6">
        <SectionHeading>current resume</SectionHeading>
        {resume ? (
          <div className="mt-2 rounded-lg border bg-card px-3 py-2 text-sm">
            {resume.label || resume.fileName}
            <span className="text-muted-foreground"> · {statusLabel(resume.extractionStatus)}</span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No resume uploaded yet.</p>
        )}
      </section>

      <section className="mt-6">
        <SectionHeading>extracted skills ({skills.length})</SectionHeading>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <Badge key={skill.id} variant="secondary">
              {skill.name}
              <span className="text-muted-foreground"> · {skill.proficiency}</span>
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}
