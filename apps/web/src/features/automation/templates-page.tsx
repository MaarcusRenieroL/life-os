import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/error';

import { automationApi } from './automation-api';
import { describeAction, describeTrigger } from './describe';

/** Ready-made rules: add one and it's yours to edit. */
export function AutomationTemplatesPage() {
  const queryClient = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({ queryKey: ['automation', 'templates'], queryFn: automationApi.templates });
  const { data: rules = [] } = useQuery({ queryKey: ['automation', 'rules'], queryFn: automationApi.rules });
  const added = new Set(rules.map((r) => r.templateKey).filter(Boolean));

  async function apply(key: string, name: string) {
    try {
      await automationApi.applyTemplate(key);
      toast.success(`Added “${name}”`);
      void queryClient.invalidateQueries({ queryKey: ['automation'] });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not add the template.'));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.key}>
              <CardContent className="flex h-full flex-col gap-2 py-4">
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <p className="text-xs text-muted-foreground">
                  {describeTrigger(t.triggerType, t.triggerConfig)} → {describeAction(t.actionType, t.actionConfig)}
                </p>
                <div className="mt-auto pt-2">
                  {added.has(t.key) ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="size-3.5" /> Added
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => void apply(t.key, t.name)}>
                      <Plus /> Add rule
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
