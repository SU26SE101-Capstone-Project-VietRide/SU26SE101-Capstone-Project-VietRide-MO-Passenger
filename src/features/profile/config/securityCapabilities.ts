/**
 * Fail-closed gates for security mutations/data that are not exposed by the
 * current public passenger backend contract.
 */
export const PROFILE_SECURITY_CAPABILITIES = Object.freeze({
  loginSessions: false,
  loginActivity: false,
});
