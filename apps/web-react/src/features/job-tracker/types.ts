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
  tailoredLatexResume: string | null;
  notes: string | null;
  appliedAt: string | null;
  rejectionReason: string | null;
  offerAmount: number | null;
  offerDeadline: string | null;
  offerNotes: string | null;
  coverLetterText: string | null;
}

export interface UpdateJobDetailsRequest {
  notes: string | null;
  appliedAt: string | null;
  rejectionReason: string | null;
  offerAmount: number | null;
  offerDeadline: string | null;
  offerNotes: string | null;
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

export interface JobFitResult {
  score: number;
  explanation: Record<string, unknown>;
}

export interface ResumeTailoringResult {
  improvementPoints: string[];
  latexResume: string;
}

/** A summary entry (no improvementPoints/latexResume) - the versions list endpoint keeps the
 * payload light since only the PDF of a given version is ever needed, not its raw content. */
export interface JobTailoringVersion {
  id: string;
  version: number;
  improvementPoints: string[] | null;
  latexResume: string | null;
  fitScore: number | null;
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
