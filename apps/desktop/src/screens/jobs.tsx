import { useApi } from '../lib/session';
import { useAsync } from '../lib/use-async';
import { Empty, ErrorNote, Panel } from '../ui';

const STAGES = ['INTERESTED', 'WAITING_FOR_REFERRAL', 'REFERRED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
const label = (s: string) => s.toLowerCase().replace(/_/g, ' ');

export function JobsScreen() {
  const api = useApi();
  const jobs = useAsync(() => api.jobs.list(), [api]);
  const list = jobs.data ?? [];
  const groups = STAGES.map((stage) => ({ stage, jobs: list.filter((j) => j.status === stage) })).filter((g) => g.jobs.length > 0);

  if (jobs.error && !jobs.data) return <ErrorNote message={jobs.error} onRetry={jobs.reload} />;

  return (
    <div className="stack">
      <Panel title="Pipeline">
        <div className="pipeline">
          {STAGES.filter((s) => list.some((j) => j.status === s)).map((s) => (
            <div key={s} className="stage"><b>{list.filter((j) => j.status === s).length}</b><small>{label(s)}</small></div>
          ))}
        </div>
      </Panel>
      {list.length === 0 && !jobs.loading && <Empty>No applications yet.</Empty>}
      {groups.map((g) => (
        <Panel key={g.stage} title={`${label(g.stage)} · ${g.jobs.length}`}>
          <ul className="list">
            {g.jobs.map((j) => (
              <li key={j.id}>
                <span className="grow"><b>{j.title}</b> <span className="muted">at {j.company}</span></span>
                {j.fitScore != null && <span className="pill">{j.fitScore}% fit</span>}
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
