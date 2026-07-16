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

export interface LogoutRequest {
  deviceSessionId: string;
}
