export interface Job {
  id: string;
  userId: string;
  company: string;
  jobTitle: string;
  location: string;
  country: string;
  workModel: WorkModel;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  jobUrl: string;
  jobDescription: string;
  jobDescriptionHtml: string;
  source: JobSource;
  sourceUrl: string;
  scrapeTimestamp: Date;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  experienceYears: number;
  seniority: Seniority;
  applicationDeadline: Date;
  status: JobStatus;
  tags: string[];
  notes: string;
  savedAt: Date;
  discoveredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deDuplicatedWithJobId: string;
}

export type WorkModel = "REMOTE" | "HYBRID" | "ONSITE";
export type JobSource = "LINKEDIN" | "NAUKRI" | "WELLFOUND";
export type Seniority =
  "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "LEAD";
export type JobStatus =
  "DISCOVERED" | "SAVED" | "APPLIED" | "DUPLICATE" | "ARCHIVED";
