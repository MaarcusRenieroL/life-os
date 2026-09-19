import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { habitsApi } from './habits-api';
import type { HabitLog } from './types';

export function HabitsCalendarView() {
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: ['habits', 'list'],
    queryFn: () => habitsApi.list(),
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['habits', 'logs', selectedHabitId],
    queryFn: () => (selectedHabitId ? habitsApi.getHabitLogs(selectedHabitId) : Promise.resolve([])),
    enabled: !!selectedHabitId,
  });

  const selectedHabit = useMemo(() => habits.find((h) => h.id === selectedHabitId), [habits, selectedHabitId]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return days;
  }, [currentMonth]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, HabitLog>();
    logs.forEach((log) => {
      map.set(log.logDate.slice(0, 10), log);
    });
    return map;
  }, [logs]);

  const getHeatmapColor = (log: HabitLog | undefined) => {
    if (!log) return 'bg-muted';
    if (log.status === 'COMPLETED') return 'bg-green-500';
    if (log.status === 'PARTIAL') return 'bg-yellow-500';
    if (log.status === 'SKIPPED') return 'bg-blue-500';
    return 'bg-red-500';
  };

  const previousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar Heatmap</h1>
        <p className="mt-2 text-sm text-muted-foreground">Visualize your habit completion patterns</p>
      </div>

      {habitsLoading ? (
        <Skeleton className="h-12" />
      ) : (
        <div>
          <label className="text-sm font-medium">Select a habit</label>
          <Select value={selectedHabitId} onValueChange={setSelectedHabitId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a habit to view" />
            </SelectTrigger>
            <SelectContent>
              {habits.map((habit) => (
                <SelectItem key={habit.id} value={habit.id}>
                  {habit.icon && <span className="mr-1">{habit.icon}</span>}
                  {habit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedHabitId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>{selectedHabit?.name} - {monthName}</CardTitle>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={previousMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={nextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((date, idx) => (
                    // Keyed by date-fns format, not toISOString: these are local calendar days,
                    // and toISOString converts to UTC first, shifting the key by a day for any
                    // viewer west of Greenwich.
                    <div key={idx} className="aspect-square">
                      {date ? (
                        <div
                          className={`w-full h-full rounded flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:ring-2 ring-foreground ${getHeatmapColor(
                            logsByDate.get(format(date, 'yyyy-MM-dd')),
                          )}`}
                          title={logsByDate.get(format(date, 'yyyy-MM-dd'))?.status ?? 'No data'}
                        >
                          {date.getDate()}
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 text-xs mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-500" />
                    <span>Partial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span>Skipped</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span>Missed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-muted" />
                    <span>No data</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
