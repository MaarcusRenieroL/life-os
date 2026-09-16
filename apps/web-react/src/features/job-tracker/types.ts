// Mirrors apps/web's core/models/job-tracker.model.ts.

export type JobStatus =
  | 'INTERESTED'
  | 'WAITING_FOR_REFERRAL'
  | 'REFERRED'
  | 'APPLIED'
  | 'INTERVIEWING'
  | 'WAITING_FOR_HR'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'REJECTED';

/** Pipeline order - matches the candidate's actual flow, not alphabetical. */
export const JOB_STATUSES: JobStatus[] = [
  'INTERESTED',
  'WAITING_FOR_REFERRAL',
  'REFERRED',
  'APPLIED',
  'INTERVIEWING',
  'WAITING_FOR_HR',
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
  'REJECTED',
];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  INTERESTED: 'Interested',
  WAITING_FOR_REFERRAL: 'Waiting for referral',
  REFERRED: 'Referred',
  APPLIED: 'Applied',
  INTERVIEWING: 'Interviewing',
  WAITING_FOR_HR: 'Waiting for HR',
  OFFER_ACCEPTED: 'Offer accepted',
  OFFER_REJECTED: 'Offer rejected',
  REJECTED: 'Rejected',
};

export interface JobListing {
  id: string;
  companyId: string | null;
  title: string;
  company: string;
  location: string | null;
  workModel: 'ONSITE' | 'HYBRID' | 'REMOTE' | null;
  url: string | null;
  source: string | null;
  jobDescriptionText: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  postedDate: string | null;
  deadline: string | null;
  seniorityLevel: string | null;
  requiredSkills: string[] | null;
  niceToHaveSkills: string[] | null;
  visaSponsorship: 'YES' | 'NO' | 'UNKNOWN' | null;
  companySize: string | null;
  growthStage: string | null;
  industry: string | null;
  tags: string[] | null;
  parseStatus: string | null;
  fitScore: number | null;
  fitExplanation: Record<string, unknown> | null;
  status: JobStatus | null;
  createdAt: string;
  tailoredImprovementPoints: string[] | null;
  tailoredLatexResume: string | null;
}

export interface JobFitResult {
  score: number;
  explanation: Record<string, unknown>;
}

export interface ResumeTailoringResult {
  improvementPoints: string[];
  latexResume: string;
}

export interface Resume {
  id: string;
  label: string | null;
  fileName: string;
  fileSize: number;
  extractionStatus: string | null;
  extractionError: string | null;
  parsed: Record<string, unknown> | null;
  createdAt: string;
}

export type EmailEventType =
  | 'JOB_ALERT_DIGEST'
  | 'APPLICATION_CONFIRMATION'
  | 'INTERVIEW_INVITE'
  | 'REJECTION'
  | 'OFFER'
  | 'UNRELATED';

export const EMAIL_EVENT_TYPE_LABELS: Record<EmailEventType, string> = {
  JOB_ALERT_DIGEST: 'New job postings',
  APPLICATION_CONFIRMATION: 'Application confirmed',
  INTERVIEW_INVITE: 'Interview invite',
  REJECTION: 'Rejection',
  OFFER: 'Offer',
  UNRELATED: 'Unrelated',
};

export interface EmailEvent {
  id: string;
  fromAddress: string;
  subject: string | null;
  snippet: string | null;
  detectedType: EmailEventType;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  matchedJobId: string | null;
  matchedJobTitle: string | null;
  matchedJobCompany: string | null;
  suggestedStatus: JobStatus | null;
  createdJobsCount: number;
  status: 'APPLIED_AUTOMATICALLY' | 'NEEDS_REVIEW' | 'IGNORED' | 'DISMISSED';
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  proficiency: string | null;
  yearsOfExperience: number | null;
  confidenceScore: number | null;
  source: string | null;
}
