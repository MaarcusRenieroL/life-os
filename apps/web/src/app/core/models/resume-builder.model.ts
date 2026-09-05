export interface ResumeSection {
  id: string;
  resumeVariantId: string;
  sectionType: string;
  title: string | null;
  content: unknown[];
  sortOrder: number;
  hidden: boolean;
}

export interface ResumeVariant {
  id: string;
  name: string;
  description: string | null;
  base: boolean;
  isPublic: boolean;
  visibility: string;
  stylingTemplate: string;
  fontFamily: string;
  accentColor: string;
  sectionOrder: string[] | null;
  sourceResumeId: string | null;
  sourceJobListingId: string | null;
  sections: ResumeSection[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Accomplishment {
  id: string;
  category: string | null;
  bulletText: string;
  keywords: string[] | null;
  usageCount: number;
}

export interface ResumeTailoring {
  id: string;
  jobListingId: string;
  applicationId: string | null;
  originalVariantId: string;
  tailoredContent: { sectionType: string; title: string | null; content: unknown[] }[];
  tailoringPrompt: string | null;
  pdfAvailable: boolean;
  createdAt: string;
}

export interface CoverLetter {
  id: string;
  applicationId: string;
  jobListingId: string;
  resumeVariantId: string | null;
  generatedContent: string;
  tone: string;
  style: string;
  customized: boolean;
  templateUsed: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoverLetterVersion {
  id: string;
  version: number;
  content: string;
  createdAt: string;
}

export interface CoverLetterTemplate {
  id: string;
  name: string;
  description: string | null;
  tone: string | null;
  style: string | null;
  isPublic: boolean;
  system: boolean;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string | null;
  sectionLayout: string[] | null;
}

export interface ResumeKeywordMatch {
  id: string;
  resumeVariantId: string;
  jobListingId: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  keywordDensity: number;
  score: number | null;
  analyzedAt: string;
}
