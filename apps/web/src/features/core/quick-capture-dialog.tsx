import { useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/error';

import { coreApi } from './core-api';

const MODULE_LABELS: Record<string, string> = {
  finance: 'Finance',
  job: 'Job Tracker',
  note: 'Notes',
};

/** The frictionless-capture entry point: one box, type anything, it figures out where it
 * belongs. Ollama classifies first (free); if that fails, this shows the same
 * "use Claude instead? this costs money" confirmation the notification bell uses for background
 * failures - here it blocks synchronously since the user is actively waiting on a result. */
export function QuickCaptureDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const queryClient = useQueryClient();

  function reset() {
    setText('');
    setNeedsApproval(false);
  }

  async function submit(useClaudeFallback: boolean) {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const result = await coreApi.quickCapture(text.trim(), useClaudeFallback);
      if (result.status === 'needs_ai_approval') {
        setNeedsApproval(true);
        return;
      }
      toast.success(`Captured to ${MODULE_LABELS[result.module ?? ''] ?? result.module}: ${result.summary}`);
      void queryClient.invalidateQueries({ queryKey: ['core', 'today'] });
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not capture that. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Sparkles className="size-3.5" />
        Quick capture
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick capture</DialogTitle>
          </DialogHeader>

          <Textarea
            autoFocus
            placeholder="spent 400 on groceries, applied to Stripe for backend engineer, remember to renew the passport…"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setNeedsApproval(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !needsApproval) {
                e.preventDefault();
                void submit(false);
              }
            }}
            rows={3}
          />

          {needsApproval && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm">
              <p className="text-yellow-700 dark:text-yellow-400">
                Ollama couldn't process this. Use Claude instead? This costs money.
              </p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" disabled={submitting} onClick={() => void submit(true)}>
                  Use Claude
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNeedsApproval(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!needsApproval && (
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={submitting || !text.trim()} onClick={() => void submit(false)}>
                {submitting ? 'Capturing…' : 'Capture'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
