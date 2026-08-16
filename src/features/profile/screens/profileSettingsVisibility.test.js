const fs = require('fs');
const path = require('path');

const readScreen = (fileName) =>
  fs.readFileSync(path.join(__dirname, fileName), 'utf8');

describe('profile settings visibility', () => {
  const settingsSource = readScreen('SettingsScreen.tsx');
  const securitySource = readScreen('SecurityScreen.tsx');
  const navigatorSource = fs.readFileSync(
    path.join(__dirname, '..', 'ProfileNavigator.tsx'),
    'utf8',
  );

  it('keeps published policies in settings without the old legal stub', () => {
    expect(settingsSource).toContain("t('settings.security.accountTitle')");
    expect(settingsSource).toContain("t('settings.policies.entryTitle')");
    expect(settingsSource).toContain("navigate('PolicyList')");
    expect(settingsSource).not.toContain('settings.legal.');
    expect(settingsSource).not.toContain('ShieldCheck');
  });

  it('keeps only the account section on the security screen', () => {
    expect(securitySource).toContain("t('security.accountSection')");
    expect(securitySource).toContain("t('security.loginEmail')");
    expect(securitySource).toContain("t('security.accountStatus')");
    expect(securitySource).toContain("t('security.changePassword.title')");

    expect(securitySource).toContain("t('security.changePassword.description')");
    expect(securitySource).toContain("navigation.navigate('ChangePassword')");
    expect(securitySource).not.toContain('changePassword.unavailableDescription');
    expect(securitySource).not.toContain(
      'PROFILE_SECURITY_CAPABILITIES.changePassword',
    );
    expect(navigatorSource).toContain(
      'name="ChangePassword" component={ChangePasswordScreen}',
    );
    expect(navigatorSource).not.toContain('ChangePasswordRoute');
    expect(securitySource).not.toContain('security.hero');
    expect(securitySource).not.toContain('security.currentDeviceSection');
    expect(securitySource).not.toContain('security.moreControlsSection');
    expect(securitySource).not.toContain('DeviceMobile');
    expect(securitySource).not.toContain('WarningCircle');
  });
});
