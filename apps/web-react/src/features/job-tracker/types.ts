// Mirrors apps/web's core/models/job-tracker.model.ts.

export type JobStatus = 'INTERESTED' | 'APPLIED' | 'INTERVIEWING' | 'REJECTED' | 'OFFER';

export const JOB_STATUSES: JobStatus[] = [
  'INTERESTED',
  'APPLIED',
  'INTERVIEWING',
  'REJECTED',
  'OFFER',
];

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

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  proficiency: string | null;
  yearsOfExperience: number | null;
  confidenceScore: number | null;
  source: string | null;
}
