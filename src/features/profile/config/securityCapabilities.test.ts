import { PROFILE_SECURITY_CAPABILITIES } from './securityCapabilities';

describe('profile security capability gates', () => {
  it('enables only security operations supported by the current BE contract', () => {
    expect(PROFILE_SECURITY_CAPABILITIES).toEqual({
      loginSessions: false,
      loginActivity: false,
    });
  });
});
