import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

import { jobApi } from './job-api';

/** Fetches the tailored LaTeX rendered to PDF (server-side, via tectonic) and shows it inline,
 * refetching whenever the underlying LaTeX changes (a re-tailor invalidates the old render). */
export function TailoredResumePdf({ jobId, latexResume, fileName }: { jobId: string; latexResume: string; fileName: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    setLoading(true);
    setError(null);
    jobApi
      .tailorResumePdf(jobId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError('Could not render the PDF. The LaTeX may have a compile error.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // Re-render whenever the tailored LaTeX itself changes, not just on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, latexResume]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Rendering PDF…</p>;
  }

  if (error || !url) {
    return <p className="text-sm text-destructive">{error ?? 'PDF unavailable.'}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <a href={url} download={fileName}>Download PDF</a>
        </Button>
      </div>
      <iframe src={url} title="Tailored resume PDF" className="h-[42rem] w-full rounded-md border bg-white" />
    </div>
  );
}
