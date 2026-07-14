import { PROFILE_SECURITY_CAPABILITIES } from './securityCapabilities';

describe('profile security capability gates', () => {
  it('keeps unsupported security operations fail-closed', () => {
    expect(PROFILE_SECURITY_CAPABILITIES).toEqual({
      changePassword: false,
      loginSessions: false,
      loginActivity: false,
    });
  });
});
