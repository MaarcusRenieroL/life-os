import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export function DisputeDialog({
  open,
  onOpenChange,
  count,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Dispute transaction{count > 1 ? 's' : ''}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Flagging {count} transaction(s) as disputed.</p>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 200))} rows={3} placeholder="Reason" />
        <DialogFooter>
          <Button
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => { onSubmit(reason); onOpenChange(false); setReason(''); }}
            disabled={!reason.trim()}
          >
            Dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
