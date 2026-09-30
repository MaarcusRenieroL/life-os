// Mirrors the Workouts API (services/workouts, base path /v1/workouts).

export type ExerciseCategory = 'CHEST' | 'BACK' | 'SHOULDERS' | 'ARMS' | 'LEGS' | 'CORE' | 'CARDIO' | 'FULL_BODY';

export const EXERCISE_CATEGORIES: ExerciseCategory[] = ['CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'LEGS', 'CORE', 'CARDIO', 'FULL_BODY'];

export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  CHEST: 'Chest',
  BACK: 'Back',
  SHOULDERS: 'Shoulders',
  ARMS: 'Arms',
  LEGS: 'Legs',
  CORE: 'Core',
  CARDIO: 'Cardio',
  FULL_BODY: 'Full body',
};

export type Equipment = 'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'CABLE' | 'BODYWEIGHT' | 'KETTLEBELL' | 'BAND' | 'OTHER';

export const EQUIPMENT: Equipment[] = ['BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT', 'KETTLEBELL', 'BAND', 'OTHER'];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  BARBELL: 'Barbell',
  DUMBBELL: 'Dumbbell',
  MACHINE: 'Machine',
  CABLE: 'Cable',
  BODYWEIGHT: 'Bodyweight',
  KETTLEBELL: 'Kettlebell',
  BAND: 'Band',
  OTHER: 'Other',
};

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  instructions: string | null;
  custom: boolean;
}

export interface SaveExerciseRequest {
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  instructions?: string | null;
}

export interface RoutineExercise {
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  position: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
  restSeconds: number;
}

export interface Routine {
  id: string;
  name: string;
  description: string | null;
  templateGroup: string | null;
  template: boolean;
  exercises: RoutineExercise[];
}

export interface RoutineExerciseInput {
  exerciseId: string;
  targetSets?: number;
  targetReps?: number;
  targetWeight?: number | null;
  restSeconds?: number;
}

export interface SaveRoutineRequest {
  name: string;
  description?: string | null;
  exercises: RoutineExerciseInput[];
}

export type SessionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';

export interface SessionSummary {
  id: string;
  name: string;
  status: SessionStatus;
  routineId: string | null;
  goalId: string | null;
  calendarEventId: string | null;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  totalSets: number;
  completedSets: number;
  volume: number;
  prCount: number;
}

export interface SessionSet {
  id: string;
  setNumber: number;
  targetReps: number | null;
  targetWeight: number | null;
  actualReps: number | null;
  actualWeight: number | null;
  restSeconds: number | null;
  completed: boolean;
  completedAt: string | null;
  pr: boolean;
}

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  position: number;
  /** Heaviest weight before this session - the number to beat. */
  previousBest: number | null;
  sets: SessionSet[];
}

export interface SessionDetail {
  session: SessionSummary;
  exercises: SessionExercise[];
}

export interface StartSessionRequest {
  routineId?: string | null;
  name?: string | null;
  goalId?: string | null;
}

export interface ScheduleSessionRequest {
  routineId?: string | null;
  name?: string | null;
  scheduledFor: string;
  goalId?: string | null;
}

export interface UpdateSessionRequest {
  name?: string | null;
  goalId?: string | null;
  notes?: string | null;
  scheduledFor?: string | null;
}

export interface UpdateSetRequest {
  actualReps: number | null;
  actualWeight: number | null;
  restSeconds: number | null;
  completed: boolean;
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  achievedAt: string;
  sessionId: string | null;
}

export interface ExerciseRecords {
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  best: PersonalRecord;
  history: PersonalRecord[];
}

export interface Measurement {
  id: string;
  measuredOn: string;
  weightKg: number | null;
  chestCm: number | null;
  waistCm: number | null;
  armsCm: number | null;
  legsCm: number | null;
  bodyFatPct: number | null;
  notes: string | null;
}

export interface SaveMeasurementRequest {
  measuredOn?: string | null;
  weightKg?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  armsCm?: number | null;
  legsCm?: number | null;
  bodyFatPct?: number | null;
  notes?: string | null;
}

export interface WeeklyWorkoutPoint {
  weekStart: string;
  sessions: number;
  volume: number;
  minutes: number;
}

export interface WorkoutAnalytics {
  weeksRequested: number;
  totalSessions: number;
  sessionsPerWeek: number;
  averageDurationMinutes: number;
  personalRecords: number;
  currentWeekSessions: number;
  weeklyTarget: number;
  currentStreakWeeks: number;
  longestStreakWeeks: number;
  weeks: WeeklyWorkoutPoint[];
}

export interface ExerciseFilters {
  q?: string;
  category?: ExerciseCategory;
  equipment?: Equipment;
}
