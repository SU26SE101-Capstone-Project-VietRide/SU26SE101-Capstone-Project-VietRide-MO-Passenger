export type UserRole =
  | 'PASSENGER'
  | 'OPERATOR_ADMIN'
  | 'OPERATOR_STAFF'
  | 'SYSTEM_ADMIN'
  | string;

export type UserStatus =
  | 'ACTIVE'
  | 'PENDING_EMAIL_VERIFICATION'
  | 'PENDING_INITIAL_PASSWORD'
  | 'LOCKED'
  | string;

export interface User {
  id: string;
  email: string | null;
  displayName: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  operatorId: string | null;
  status: UserStatus;
  avatarUrl: string | null;
}

export interface AuthUserDto {
  id: string;
  email: string;
  displayName: string;
  phone?: string | null;
  role: UserRole;
  operatorId: string | null;
  status: UserStatus;
  avatarUrl?: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: User;
}

export interface TokenBundleDto {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: AuthUserDto;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  phone: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  status: UserStatus;
  otpTtlMinutes: number;
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
  purpose: 'REGISTRATION' | 'PASSWORD_RESET' | 'SET_INITIAL_PASSWORD' | string;
}

export interface VerifyEmailResponse {
  userId: string;
  status: UserStatus;
}

export interface PasswordResetPayload {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  otpTtlMinutes: number;
  debugOtpCode?: string;
  mocked?: boolean;
}

export interface ConfirmPasswordResetOtpPayload {
  email: string;
  code: string;
}

export interface ConfirmPasswordResetOtpResponse {
  resetToken: string;
  resetTokenTtlMinutes: number;
  mocked?: boolean;
}

export interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  userId: string;
  status: UserStatus;
}

export interface GoogleLoginPayload {
  idToken: string;
}

export const mapAuthUser = (dto: AuthUserDto): User => {
  const displayName = dto.displayName.trim();

  return {
    id: dto.id,
    email: dto.email,
    displayName,
    fullName: displayName,
    phone: dto.phone ?? null,
    role: dto.role,
    operatorId: dto.operatorId,
    status: dto.status,
    avatarUrl: dto.avatarUrl ?? null,
  };
};

export const mapTokenBundle = (dto: TokenBundleDto): AuthSession => ({
  accessToken: dto.accessToken,
  refreshToken: dto.refreshToken,
  expiresInSeconds: dto.expiresInSeconds,
  user: mapAuthUser(dto.user),
});
