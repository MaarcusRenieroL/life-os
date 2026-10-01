// Mirrors the journal API served by the notes service at /v1/notes/journal.

import type { NoteModuleType } from './types';

export interface JournalPrompt {
  id: string;
  category: string;
  text: string;
}

export interface JournalPromptAnswer {
  prompt: string;
  answer: string;
}

export interface JournalLink {
  id: string;
  moduleType: NoteModuleType;
  moduleId: string;
  createdAt: string;
}

export interface JournalEntry {
  noteId: string;
  title: string;
  entryDate: string;
  mood: number | null;
  energy: number | null;
  freeWriting: string | null;
  prompts: JournalPromptAnswer[];
  excerpt: string;
  links: JournalLink[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalDailyPoint {
  date: string;
  mood: number | null;
  energy: number | null;
  entries: number;
}

export interface JournalInsights {
  totalEntries: number;
  averageMood: number | null;
  averageEnergy: number | null;
  currentStreakDays: number;
  longestStreakDays: number;
  days: JournalDailyPoint[];
}

export interface JournalFilters {
  from?: string;
  to?: string;
  mood?: number;
  q?: string;
}

export interface SaveJournalEntryRequest {
  title?: string | null;
  entryDate?: string | null;
  mood?: number | null;
  energy?: number | null;
  freeWriting?: string | null;
  prompts: JournalPromptAnswer[];
  links: { moduleType: 'GOAL' | 'PROJECT'; moduleId: string }[];
}

export const MOOD_LABELS: Record<number, string> = { 1: 'Rough', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' };

export const ENERGY_LABELS: Record<number, string> = { 1: 'Drained', 2: 'Low', 3: 'Steady', 4: 'Energised', 5: 'Charged' };
