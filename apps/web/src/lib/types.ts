// Shared response envelope and auth shapes - mirrors apps/web's
// core/models/auth.model.ts exactly, since it's the same backend.

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  deviceSessionId: string;
}

export interface LoginRequest {
  email: string;
  rawPassword: string;
  deviceName: string;
  deviceType: string;
}

export interface DeviceSession {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: string;
  createdAt: string;
  lastActiveAt: string;
  revokedAt: string | null;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  name: string | null;
  hasAvatar: boolean;
}
