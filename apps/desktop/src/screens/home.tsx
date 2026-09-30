import { RANK_HEX, groupQuests, toQuests, type HeatCell } from '@life-os/core';

import { usePlayer } from '../lib/player';
import { useApi } from '../lib/session';
import { useAsync } from '../lib/use-async';
import { Bar, Empty, inr, Panel, Stat } from '../ui';

const HEAT = ['#161a1f', '#14382b', '#1d6b4d', '#2fae79', '#7dffc3'];

function Heatmap({ grid }: { grid: HeatCell[][] }) {
  return (
    <div className="heat">
      {grid.map((week, i) => (
        <div key={i} className="heat-col">
          {week.map((cell) => (
            <i key={cell.date} title={`${cell.date} · ${cell.xp} XP`} style={{ background: cell.future ? 'transparent' : HEAT[cell.intensity] }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function HomeScreen() {
  const api = useApi();
  const { player } = usePlayer();
  const today = useAsync(() => api.today(), [api]);
  const quests = toQuests(today.data ?? []);
  const groups = groupQuests(quests);
  const [value, target] = player.challengeProgress;
  const almost = player.achievements.filter((a) => a.next != null).sort((a, b) => b.pct - a.pct).slice(0, 3);
  const week = player.week;

  return (
    <div className="grid home">
      <Panel title="Daily challenge" accent={player.challengeDone ? 'var(--gold)' : undefined}>
        <h3>{player.challenge.title}</h3>
        <p className="muted">{player.challengeDone ? 'Challenge won. +50 XP banked.' : player.challenge.hint}</p>
        <Bar pct={target ? (value / target) * 100 : 0} color="var(--gold)" />
        <small className="muted">{value} / {target}</small>
      </Panel>

      <Panel title="This week">
        <div className="stats">
          <Stat label="Tasks" value={week?.tasksCompleted ?? '—'} sub={week ? `${week.tasksDue} due` : undefined} />
          <Stat label="Focus" value={week ? `${week.focusHours}h` : '—'} />
          <Stat label="Workouts" value={week?.workouts ?? '—'} />
          <Stat label="Spent" value={inr(week?.spending)} />
        </div>
      </Panel>

      <Panel title="Attributes">
        <div className="attrs">
          {player.attributes.map((a) => (
            <div key={a.key} className="attr" title={a.source}>
              <span className="label">{a.key}</span>
              <Bar pct={a.value ?? 0} color={a.value == null ? 'var(--line)' : RANK_HEX[player.rank.letter]} />
              <b>{a.value ?? '—'}</b>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Today's quests">
        {today.loading && !today.data ? <Empty>Loading…</Empty> : quests.length === 0 ? <Empty>Nothing on the board. Enjoy it.</Empty> : (
          <ul className="list">
            {[...groups.main, ...groups.daily].slice(0, 6).map((q) => (
              <li key={`${q.item.type}:${q.item.entityId}:${q.item.title}`}>
                <span className={`tier ${q.tier}`} />
                <span className="grow">{q.item.title}</span>
                <span className="xp">+{q.xp}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Almost there">
        {almost.length === 0 ? <Empty>Every medal is maxed. Legend.</Empty> : almost.map((a) => (
          <div key={a.def.id} className="almost">
            <div className="row"><b>{a.def.name}</b><small>{a.value} / {a.next} {a.def.unit}</small></div>
            <Bar pct={a.pct} color="var(--gold)" />
          </div>
        ))}
      </Panel>

      <Panel title="Campaign log">
        <Heatmap grid={player.heatmap} />
      </Panel>
    </div>
  );
}
