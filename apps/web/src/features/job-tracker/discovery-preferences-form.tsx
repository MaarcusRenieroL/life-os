import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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

import { discoveryApi } from './discovery-api';
import { SENIORITY_LEVELS, type SeniorityLevel } from './discovery-types';

const AUTO = 'AUTO';
const split = (value: string) => value.split(',').map((v) => v.trim()).filter(Boolean);

export function DiscoveryPreferencesForm({ onSaved }: { onSaved?: () => void }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['jobs', 'discovery', 'preferences'], queryFn: discoveryApi.preferences });

  const [include, setInclude] = useState('');
  const [exclude, setExclude] = useState('');
  const [locations, setLocations] = useState('');
  const [seniority, setSeniority] = useState<string>(AUTO);
  const [alertMin, setAlertMin] = useState('60');

  useEffect(() => {
    if (!data) return;
    setInclude(data.titleInclude.join(', '));
    setExclude(data.titleExclude.join(', '));
    setLocations(data.locations.join(', '));
    setSeniority(data.maxSeniority ?? AUTO);
    setAlertMin(String(data.alertMinScore));
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      discoveryApi.savePreferences({
        titleInclude: split(include),
        titleExclude: split(exclude),
        locations: split(locations),
        maxSeniority: seniority === AUTO ? null : (seniority as SeniorityLevel),
        alertMinScore: Math.max(0, Math.min(100, Number(alertMin) || 0)),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'discovery'] });
      toast.success('Saved. Applies from the next scan.');
      onSaved?.();
    },
    onError: () => toast.error('Could not save preferences.'),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Title must contain (any)</Label>
        <Input value={include} onChange={(e) => setInclude(e.target.value)} placeholder="engineer, developer, software" />
        <p className="text-xs text-muted-foreground">
          Comma separated. Empty keeps every role, which on a big company board is mostly noise.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Skip titles containing</Label>
        <Input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="manager, sales, recruiter" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Locations (remote always counts)</Label>
        <Input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="bangalore, india, remote" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Highest level to apply for</Label>
        <Select value={seniority} onValueChange={setSeniority}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={AUTO}>Automatic (from your skills&apos; years)</SelectItem>
            {SENIORITY_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>{level.charAt(0) + level.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Roles above this are capped at 30 however well the skills match.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Notify me at fit score</Label>
        <Input type="number" min={0} max={100} value={alertMin} onChange={(e) => setAlertMin(e.target.value)} />
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>Save preferences</Button>
    </div>
  );
}
