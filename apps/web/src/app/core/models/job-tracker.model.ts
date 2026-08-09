// Mirrors services/job-tracker DTOs (com.lifeos.job_tracker.domains.dto/enums).

export type WorkModel = 'REMOTE' | 'HYBRID' | 'ONSITE';
export type JobSource = 'LINKEDIN' | 'NAUKRI' | 'WELLFOUND';
export type Seniority = 'INTERN' | 'JUNIOR' | 'MID' | 'SENIOR' | 'STAFF' | 'PRINCIPAL' | 'LEAD';
export type JobStatus = 'DISCOVERED' | 'SAVED' | 'APPLIED' | 'DUPLICATE' | 'ARCHIVED';
export type ApplicationStage =
  | 'APPLIED'
  | 'RECRUITER_SCREENING'
  | 'INTERVIEWING'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN';
export type ApplicationStatus = 'ACTIVE' | 'OFFER_RECEIVED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type NotificationReferenceType = 'JOB' | 'APPLICATION' | 'INTERVIEW' | 'CONTACT';

// --- Jobs ---

export interface JobResponse {
  id: string;
  company: string;
  jobTitle: string;
  location: string;
  country: string;
  workModel: WorkModel;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  jobUrl: string;
  jobDescription: string | null;
  source: JobSource;
  sourceUrl: string | null;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniority: Seniority;
  status: JobStatus;
  tags: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// --- Applications ---

export interface ApplicationResponse {
  id: string;
  jobId: string;
  applicationDate: string | null;
  resumeVersion: string | null;
  resumeS3Path: string | null;
  resumeGenerationTimestamp: string | null;
  resumeTailoringPrompt: string | null;
  resumeTailoringReasoning: string | null;
  coverLetterSubmitted: boolean;
  coverLetterS3Path: string | null;
  aiScorePercentage: number | null;
  aiScoreReasoning: string | null;
  aiRecommendedSections: string[] | null;
  aiInterviewPrepTopics: string[] | null;
  linkedNoteIds: string[] | null;
  currentStage: ApplicationStage;
  rejectionReason: string | null;
  rejectionDate: string | null;
  withdrawnReason: string | null;
  withdrawnDate: string | null;
  offerDetails: Record<string, unknown> | null;
  lastFollowUpDate: string | null;
  nextFollowUpDate: string | null;
  status: ApplicationStatus;
  notes: string | null;
  referralReceived: boolean;
  referralNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationRequest {
  jobId: string;
  applicationDate?: string;
  resumeVersion?: string;
  coverLetterSubmitted?: boolean;
  notes?: string;
}

export interface UpdateApplicationRequest {
  currentStage?: ApplicationStage;
  status?: ApplicationStatus;
  coverLetterSubmitted?: boolean;
  rejectionReason?: string;
  rejectionDate?: string;
  withdrawnReason?: string;
  withdrawnDate?: string;
  lastFollowUpDate?: string;
  nextFollowUpDate?: string;
  notes?: string;
  referralReceived?: boolean;
  referralNotes?: string;
}

export interface ScoreApplicationRequest {
  resumeText: string;
}

// --- Resumes ---

export interface ResumeUploadResponse {
  id: string;
  version: string;
  isActive: boolean;
  uploadedAt: string;
  resumeText: string | null;
}

// --- Notifications ---

export interface NotificationResponse {
  id: string;
  referenceType: NotificationReferenceType | null;
  referenceId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSettingsResponse {
  id: string;
  emailOnStageChange: boolean;
  emailOnInterviewScheduled: boolean;
  emailOnOfferReceived: boolean;
  emailOnFollowUpDue: boolean;
  updatedAt: string;
}

export interface UpdateNotificationSettingsRequest {
  emailOnStageChange?: boolean;
  emailOnInterviewScheduled?: boolean;
  emailOnOfferReceived?: boolean;
  emailOnFollowUpDue?: boolean;
}
