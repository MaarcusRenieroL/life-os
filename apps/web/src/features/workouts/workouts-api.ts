import { api, unwrap } from '@/lib/api-client';

import type {
  Exercise,
  ExerciseFilters,
  ExerciseRecords,
  Measurement,
  Routine,
  SaveExerciseRequest,
  SaveMeasurementRequest,
  SaveRoutineRequest,
  ScheduleSessionRequest,
  SessionDetail,
  SessionStatus,
  SessionSummary,
  StartSessionRequest,
  UpdateSessionRequest,
  UpdateSetRequest,
  WorkoutAnalytics,
} from './types';

const baseUrl = '/v1/workouts';

/** Weeks roll over at the user's midnight, so the backend needs the browser's zone. */
function browserZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export const workoutsApi = {
  // ---- exercises ----
  exercises(filters: ExerciseFilters = {}): Promise<Exercise[]> {
    return unwrap(api.get(`${baseUrl}/exercises`, { params: filters }));
  },
  createExercise(request: SaveExerciseRequest): Promise<Exercise> {
    return unwrap(api.post(`${baseUrl}/exercises`, request));
  },
  async deleteExercise(id: string): Promise<void> {
    await api.delete(`${baseUrl}/exercises/${id}`);
  },

  // ---- routines ----
  routines(): Promise<Routine[]> {
    return unwrap(api.get(`${baseUrl}/routines`));
  },
  templates(): Promise<Routine[]> {
    return unwrap(api.get(`${baseUrl}/routines/templates`));
  },
  copyTemplate(id: string): Promise<Routine> {
    return unwrap(api.post(`${baseUrl}/routines/templates/${id}/copy`, {}));
  },
  createRoutine(request: SaveRoutineRequest): Promise<Routine> {
    return unwrap(api.post(`${baseUrl}/routines`, request));
  },
  updateRoutine(id: string, request: SaveRoutineRequest): Promise<Routine> {
    return unwrap(api.put(`${baseUrl}/routines/${id}`, request));
  },
  async deleteRoutine(id: string): Promise<void> {
    await api.delete(`${baseUrl}/routines/${id}`);
  },

  // ---- sessions ----
  sessions(params: { status?: SessionStatus; from?: string; to?: string } = {}): Promise<SessionSummary[]> {
    return unwrap(api.get(`${baseUrl}/sessions`, { params }));
  },
  currentSession(): Promise<SessionDetail | null> {
    return unwrap(api.get(`${baseUrl}/sessions/current`));
  },
  session(id: string): Promise<SessionDetail> {
    return unwrap(api.get(`${baseUrl}/sessions/${id}`));
  },
  startSession(request: StartSessionRequest): Promise<SessionDetail> {
    return unwrap(api.post(`${baseUrl}/sessions/start`, request));
  },
  scheduleSession(request: ScheduleSessionRequest): Promise<SessionDetail> {
    return unwrap(api.post(`${baseUrl}/sessions/schedule`, request));
  },
  startPlanned(id: string): Promise<SessionDetail> {
    return unwrap(api.post(`${baseUrl}/sessions/${id}/start`, {}));
  },
  updateSession(id: string, request: UpdateSessionRequest): Promise<SessionDetail> {
    return unwrap(api.put(`${baseUrl}/sessions/${id}`, request));
  },
  completeSession(id: string, notes?: string): Promise<SessionDetail> {
    return unwrap(api.post(`${baseUrl}/sessions/${id}/complete`, { notes: notes?.trim() || null }));
  },
  async deleteSession(id: string): Promise<void> {
    await api.delete(`${baseUrl}/sessions/${id}`);
  },
  addSet(sessionId: string, exerciseId: string): Promise<SessionDetail> {
    return unwrap(api.post(`${baseUrl}/sessions/${sessionId}/sets`, { exerciseId }));
  },
  updateSet(sessionId: string, setId: string, request: UpdateSetRequest): Promise<SessionDetail> {
    return unwrap(api.put(`${baseUrl}/sessions/${sessionId}/sets/${setId}`, request));
  },
  deleteSet(sessionId: string, setId: string): Promise<SessionDetail> {
    return unwrap(api.delete(`${baseUrl}/sessions/${sessionId}/sets/${setId}`));
  },

  // ---- records, measurements, analytics ----
  records(): Promise<ExerciseRecords[]> {
    return unwrap(api.get(`${baseUrl}/records`));
  },
  measurements(params: { from?: string; to?: string } = {}): Promise<Measurement[]> {
    return unwrap(api.get(`${baseUrl}/measurements`, { params }));
  },
  createMeasurement(request: SaveMeasurementRequest): Promise<Measurement> {
    return unwrap(api.post(`${baseUrl}/measurements`, request));
  },
  updateMeasurement(id: string, request: SaveMeasurementRequest): Promise<Measurement> {
    return unwrap(api.put(`${baseUrl}/measurements/${id}`, request));
  },
  async deleteMeasurement(id: string): Promise<void> {
    await api.delete(`${baseUrl}/measurements/${id}`);
  },
  analytics(weeks = 12, target = 3): Promise<WorkoutAnalytics> {
    return unwrap(api.get(`${baseUrl}/analytics`, { params: { weeks, target, zone: browserZone() } }));
  },
};
