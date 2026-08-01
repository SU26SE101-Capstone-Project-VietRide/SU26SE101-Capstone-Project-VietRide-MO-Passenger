/**
 * App-owned copy for auth errors that originate outside the HTTP contract.
 * Backend/network codes continue to use the shared API error map.
 */
export const AUTH_ERROR_TRANSLATION_KEYS = {
  AUTH_LOCAL_SESSION_CLEAR_FAILED: 'auth.errors.sessionClearFailed',
  COMPLETE_PROFILE_SESSION_REFRESH_FAILED: 'auth.completeProfile.sessionRefreshFailed',
  GOOGLE_CONFIGURATION_ERROR: 'auth.google.errors.configuration',
  GOOGLE_ID_TOKEN_MISSING: 'auth.google.errors.tokenMissing',
  GOOGLE_PLAY_SERVICES_UNAVAILABLE: 'auth.google.errors.playServicesUnavailable',
  GOOGLE_SIGN_IN_FAILED: 'auth.google.errors.generic',
  GOOGLE_SIGN_IN_IN_PROGRESS: 'auth.google.errors.inProgress',
} as const satisfies Readonly<Record<string, string>>;
