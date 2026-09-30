// Mirrors the /v1/jobs/discovery DTOs in services/job-tracker.

export type JobBoard = 'GREENHOUSE' | 'LEVER' | 'ASHBY' | 'WORKABLE' | 'WORKDAY' | 'ORACLE';

export const JOB_BOARDS: { value: JobBoard; label: string; hint: string }[] = [
  { value: 'GREENHOUSE', label: 'Greenhouse', hint: 'boards.greenhouse.io/figma → figma' },
  { value: 'ASHBY', label: 'Ashby', hint: 'jobs.ashbyhq.com/ramp → ramp' },
  { value: 'LEVER', label: 'Lever', hint: 'jobs.lever.co/spotify → spotify' },
  { value: 'WORKABLE', label: 'Workable', hint: 'apply.workable.com/acme → acme' },
  { value: 'WORKDAY', label: 'Workday', hint: 'adobe.wd5.myworkdayjobs.com/external → adobe/wd5/external' },
  { value: 'ORACLE', label: 'Oracle Recruiting', hint: 'host.oraclecloud.com + site → host.oraclecloud.com/CX_1' },
];

export interface WatchedCompany {
  id: string;
  name: string;
  board: JobBoard;
  slug: string;
  domain: string | null;
  alert: boolean;
  active: boolean;
  baselinedAt: string | null;
  lastFetchedAt: string | null;
  lastFetchError: string | null;
  lastOpenCount: number | null;
}

export interface AddWatchedCompanyRequest {
  name: string;
  board: JobBoard;
  slug: string;
  domain?: string;
  alert?: boolean;
}

export interface DiscoveredJob {
  id: string;
  watchedCompanyId: string;
  company: string;
  title: string;
  url: string | null;
  location: string | null;
  postedAt: string | null;
  firstSeenAt: string;
  fitScore: number | null;
  fitExplanation: {
    matchedSkills?: string[];
    caps?: string[];
    confidence?: string;
  } | null;
  status: 'NEW' | 'DISMISSED' | 'PROMOTED';
  promotedJobId: string | null;
  description: string | null;
}

export type SeniorityLevel = 'INTERN' | 'JUNIOR' | 'MID' | 'SENIOR' | 'STAFF' | 'LEAD' | 'PRINCIPAL';

export const SENIORITY_LEVELS: SeniorityLevel[] = [
  'INTERN', 'JUNIOR', 'MID', 'SENIOR', 'STAFF', 'LEAD', 'PRINCIPAL',
];

export interface DiscoveryPreferences {
  titleInclude: string[];
  titleExclude: string[];
  locations: string[];
  maxSeniority: SeniorityLevel | null;
  alertMinScore: number;
}
