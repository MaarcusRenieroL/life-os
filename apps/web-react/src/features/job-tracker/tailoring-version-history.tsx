import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { jobApi } from './job-api';

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Every past tailor/re-tailor attempt for this job, newest first - each one is a separate PDF
 * to download, since only the latest is ever shown inline on the page itself. */
export function TailoringVersionHistory({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const { data: versions = [] } = useQuery({
    queryKey: ['jobs', jobId, 'tailor-resume', 'versions'],
    queryFn: () => jobApi.tailoringVersions(jobId),
  });

  if (versions.length <= 1) return null;

  // Mirrors the backend: "current" is always whichever attempt scored highest, not the latest -
  // versions are already newest-first, so the first max is the most recent among ties.
  const bestScore = Math.max(...versions.map((v) => v.fitScore ?? -1));
  const currentVersionId = versions.find((v) => v.fitScore === bestScore)?.id;

  async function downloadVersion(versionId: string, version: number) {
    const blob = await jobApi.tailoringVersionPdf(jobId, versionId);
    downloadBlob(blob, `${jobTitle}-resume-v${version}.pdf`);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">History ({versions.length})</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="flex flex-col gap-1">
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => void downloadVersion(v.id, v.version)}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <span>
                v{v.version} <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                {v.id === currentVersionId && <span className="ml-1 text-xs text-primary">(current)</span>}
                {v.basedOn === 'OVERRIDE_RESUME' && (
                  <span className="ml-1 text-xs text-muted-foreground">(from uploaded resume)</span>
                )}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {v.fitScore !== null && <span>Fit {v.fitScore}</span>}
                <span className="text-primary">Download</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
