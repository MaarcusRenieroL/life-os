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
  | 'REJECTED'
  | 'WITHDRAWN';

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
  'WITHDRAWN',
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
  WITHDRAWN: 'Withdrawn',
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
  tailoredGapsVsJd: string[] | null;
  tailoredInferredClaims: string[] | null;
  tailoredLatexResume: string | null;
  notes: string | null;
  appliedAt: string | null;
  rejectionReason: string | null;
  offerAmount: number | null;
  offerDeadline: string | null;
  offerNotes: string | null;
  coverLetterText: string | null;
  followUpAt: string | null;
  overrideResumeFileName: string | null;
  overrideResumeUploadedAt: string | null;
  fitScoreSource: 'LIBRARY' | 'TAILORED_RESUME' | 'OVERRIDE_RESUME' | null;
}

export interface UpdateJobDetailsRequest {
  notes: string | null;
  appliedAt: string | null;
  rejectionReason: string | null;
  offerAmount: number | null;
  offerDeadline: string | null;
  offerNotes: string | null;
  followUpAt: string | null;
}

export type InterviewRoundType =
  | 'RECRUITER_SCREENING'
  | 'CODING_ASSESSMENT'
  | 'TECHNICAL'
  | 'SYSTEM_DESIGN'
  | 'HIRING_MANAGER'
  | 'HR_DISCUSSION';

export const INTERVIEW_ROUND_TYPES: InterviewRoundType[] = [
  'RECRUITER_SCREENING',
  'CODING_ASSESSMENT',
  'TECHNICAL',
  'SYSTEM_DESIGN',
  'HIRING_MANAGER',
  'HR_DISCUSSION',
];

export const INTERVIEW_ROUND_TYPE_LABELS: Record<InterviewRoundType, string> = {
  RECRUITER_SCREENING: 'Recruiter screening',
  CODING_ASSESSMENT: 'Coding assessment',
  TECHNICAL: 'Technical',
  SYSTEM_DESIGN: 'System design',
  HIRING_MANAGER: 'Hiring manager',
  HR_DISCUSSION: 'HR discussion',
};

export type InterviewResultStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'CANCELLED';

export const INTERVIEW_RESULTS: InterviewResultStatus[] = ['PENDING', 'PASSED', 'FAILED', 'CANCELLED'];

export const INTERVIEW_RESULT_LABELS: Record<InterviewResultStatus, string> = {
  PENDING: 'Pending',
  PASSED: 'Passed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export interface Interview {
  id: string;
  jobId: string;
  roundType: InterviewRoundType | null;
  scheduledAt: string | null;
  interviewerName: string | null;
  meetingLink: string | null;
  topics: string[] | null;
  preparationNotes: string | null;
  questionsAsked: string | null;
  performanceNotes: string | null;
  result: InterviewResultStatus | null;
  createdAt: string;
}

export interface UpsertInterviewRequest {
  roundType: InterviewRoundType;
  scheduledAt: string | null;
  interviewerName: string | null;
  meetingLink: string | null;
  preparationNotes: string | null;
  questionsAsked: string | null;
  performanceNotes: string | null;
  result: InterviewResultStatus;
}

export type ReferralStatus = 'NOT_CONTACTED' | 'MESSAGE_DRAFTED' | 'CONTACTED' | 'RESPONDED' | 'REFERRED' | 'DECLINED';

export const REFERRAL_STATUSES: ReferralStatus[] = [
  'NOT_CONTACTED',
  'MESSAGE_DRAFTED',
  'CONTACTED',
  'RESPONDED',
  'REFERRED',
  'DECLINED',
];

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  NOT_CONTACTED: 'Not contacted',
  MESSAGE_DRAFTED: 'Message drafted',
  CONTACTED: 'Contacted',
  RESPONDED: 'Responded',
  REFERRED: 'Referred',
  DECLINED: 'Declined',
};

export interface Referral {
  id: string;
  jobId: string;
  contactName: string;
  contactTitle: string | null;
  contactLinkedinUrl: string | null;
  contactEmail: string | null;
  relationship: string | null;
  status: ReferralStatus | null;
  draftMessage: string | null;
  notes: string | null;
  contactedAt: string | null;
  followUpAt: string | null;
  createdAt: string;
}

export interface UpsertReferralRequest {
  contactName: string;
  contactTitle: string | null;
  contactLinkedinUrl: string | null;
  contactEmail: string | null;
  relationship: string | null;
  status: ReferralStatus;
  notes: string | null;
  contactedAt: string | null;
  followUpAt: string | null;
}

export interface JobFitResult {
  score: number;
  explanation: Record<string, unknown>;
}

export interface ResumeTailoringResult {
  improvementPoints: string[];
  gapsVsJd: string[] | null;
  inferredClaims: string[] | null;
  latexResume: string;
}

/** A summary entry (no improvementPoints/latexResume) - the versions list endpoint keeps the
 * payload light since only the PDF of a given version is ever needed, not its raw content. */
export interface JobTailoringVersion {
  id: string;
  version: number;
  improvementPoints: string[] | null;
  gapsVsJd: string[] | null;
  inferredClaims: string[] | null;
  latexResume: string | null;
  fitScore: number | null;
  basedOn: 'GLOBAL_RESUME' | 'OVERRIDE_RESUME' | null;
  createdAt: string;
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

export interface CareerProfile {
  userId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkExperience {
  id: string;
  title: string;
  company: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  current: boolean;
  bullets: string[] | null;
  displayOrder: number;
}

export interface UpsertWorkExperienceRequest {
  title: string;
  company: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  current: boolean;
  bullets: string[];
  displayOrder: number;
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string | null;
  techStack: string[] | null;
  link: string | null;
  startDate: string | null;
  endDate: string | null;
  bullets: string[] | null;
  displayOrder: number;
}

export interface UpsertProjectRequest {
  name: string;
  description: string | null;
  techStack: string[];
  link: string | null;
  startDate: string | null;
  endDate: string | null;
  bullets: string[];
  displayOrder: number;
}

export interface CareerProfileBundle {
  onboarded: boolean;
  profile: CareerProfile | null;
  experiences: WorkExperience[];
  projects: ProjectEntry[];
  skills: Skill[];
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface WeeklyCount {
  weekStart: string;
  count: number;
}

export interface SourcePerformance {
  source: string;
  applications: number;
  responseRatePct: number;
}

export interface SkillFrequency {
  skill: string;
  count: number;
}

export interface StageDwellTime {
  stage: string;
  avgDays: number;
  sampleSize: number;
}

export interface JobAnalytics {
  totalApplications: number;
  applicationsByDay: DailyCount[];
  applicationsByWeek: WeeklyCount[];
  responseRatePct: number;
  rejectionRatePct: number;
  interviewConversionRatePct: number;
  offerRatePct: number;
  referralResponseRatePct: number;
  bestPerformingSources: SourcePerformance[];
  mostCommonMissingSkills: SkillFrequency[];
  averageTimeInStage: StageDwellTime[];
}

export interface AiUsageDailyCost {
  date: string;
  costUsd: number;
}

export interface AiUsageSummary {
  totalCostUsd: number;
  costThisMonthUsd: number;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  costLast30Days: AiUsageDailyCost[];
}
