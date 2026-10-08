export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AuthState {
  user: UserProfile | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean; // Indicates if real Supabase environment variables are provided
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PasswordResetPayload {
  email: string;
}
