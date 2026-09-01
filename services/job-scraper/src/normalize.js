// Maps a raw posting (from any adapter) onto the ScrapedJob shape the
// job-tracker /v1/jobs/internal/jobs/ingest endpoint expects.

const WORK_MODEL = {
  remote: 'REMOTE',
  hybrid: 'HYBRID',
  'on-site': 'ONSITE',
  onsite: 'ONSITE',
  office: 'ONSITE',
};

const SENIORITY = {
  intern: 'INTERN',
  internship: 'INTERN',
  junior: 'JUNIOR',
  entry: 'JUNIOR',
  associate: 'JUNIOR',
  mid: 'MID',
  'mid-level': 'MID',
  senior: 'SENIOR',
  staff: 'STAFF',
  lead: 'LEAD',
  principal: 'PRINCIPAL',
};

function guessFrom(map, text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();
  for (const [needle, value] of Object.entries(map)) {
    if (lower.includes(needle)) return value;
  }
  return null;
}

export function normalize(raw, source) {
  const title = raw.title || raw.name || null;
  const company =
    raw.company ||
    raw.companyName ||
    raw.hiringOrganization?.name ||
    (typeof raw.hiringOrganization === 'string' ? raw.hiringOrganization : null);
  if (!title || !company) return null;

  const description = raw.description || raw.jobDescriptionText || raw.summary || null;
  const location =
    raw.location ||
    raw.jobLocation?.address?.addressLocality ||
    raw.jobLocation?.address?.addressRegion ||
    (Array.isArray(raw.jobLocation) ? raw.jobLocation[0]?.address?.addressLocality : null) ||
    null;

  const salary = raw.baseSalary?.value || {};
  return {
    externalId: raw.externalId || raw.id || raw.identifier?.value || raw.url || null,
    title,
    company,
    location,
    workModel:
      guessFrom(WORK_MODEL, raw.workModel) ||
      guessFrom(WORK_MODEL, location) ||
      guessFrom(WORK_MODEL, `${title} ${description}`),
    url: raw.url || raw.applyUrl || raw.link || null,
    jobDescriptionText: description,
    source: raw.source || source || 'scraper',
    salaryMin: numeric(salary.minValue ?? raw.salaryMin),
    salaryMax: numeric(salary.maxValue ?? raw.salaryMax ?? salary.value),
    currency: raw.baseSalary?.currency || raw.currency || null,
    postedDate: dateOnly(raw.datePosted || raw.postedDate),
    seniorityLevel:
      guessFrom(SENIORITY, raw.seniorityLevel) ||
      guessFrom(SENIORITY, raw.experienceRequirements) ||
      guessFrom(SENIORITY, title),
    industry: raw.industry || raw.hiringOrganization?.industry || null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    recruiterEmail: raw.recruiterEmail || extractEmail(description),
  };
}

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function dateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function extractEmail(text) {
  if (!text) return null;
  const match = String(text).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return match ? match[0] : null;
}
