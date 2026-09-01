// Job Tracker module - response shapes from the job-tracker service
// (/v1/jobs, /v1/applications, /v1/resumes, /v1/skills, /v1/contacts).

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
  saved: boolean;
  dismissed: boolean;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface JobFitResult {
  score: number;
  explanation: Record<string, unknown>;
}

export type ApplicationStatus =
  | 'Discovered'
  | 'Saved'
  | 'Applied'
  | 'Recruiter Contacted'
  | 'Screening'
  | 'Technical Interview'
  | 'System Design Interview'
  | 'Final Interview'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export interface Application {
  id: string;
  jobListingId: string;
  resumeId: string | null;
  company: string | null;
  jobTitle: string | null;
  status: ApplicationStatus;
  applicationMethod: string | null;
  applicationDate: string | null;
  followUpReminderDate: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  oldStatus: string | null;
  newStatus: string;
  note: string | null;
  changedBy: string | null;
  changedAt: string;
}

export interface InterviewRound {
  id: string;
  applicationId: string;
  type: string;
  scheduledDate: string | null;
  interviewerName: string | null;
  meetingLink: string | null;
  durationMinutes: number | null;
  topics: string[] | null;
  preparationNotes: string | null;
  actualStatus: string | null;
  selfAssessmentScore: number | null;
  postInterviewNotes: string | null;
  completedAt: string | null;
}

export interface Referral {
  id: string;
  applicationId: string;
  contactId: string;
  outreachDate: string | null;
  messageSent: string | null;
  responseReceived: boolean;
  responseDate: string | null;
  referralStatus: string;
  followUpDate: string | null;
  notes: string | null;
}

export interface Offer {
  id: string;
  applicationId: string;
  salary: number | null;
  currency: string | null;
  benefits: string[] | null;
  startDate: string | null;
  notes: string | null;
  accepted: boolean | null;
}

export interface ApplicationDetail {
  application: Application;
  job: JobListing;
  statusHistory: StatusHistoryEntry[];
  interviews: InterviewRound[];
  referrals: Referral[];
  offer: Offer | null;
}

export interface Resume {
  id: string;
  label: string | null;
  fileName: string;
  fileSize: number;
  extractionStatus: string | null;
  extractionError: string | null;
  base: boolean;
  tailoredForApplicationId: string | null;
  parsed: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
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

export interface Contact {
  id: string;
  companyId: string | null;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  relationshipType: string | null;
  vip: boolean;
  lastInteractionDate: string | null;
  notes: string | null;
  createdAt: string;
}
