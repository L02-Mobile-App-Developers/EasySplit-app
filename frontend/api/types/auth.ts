export interface User {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
