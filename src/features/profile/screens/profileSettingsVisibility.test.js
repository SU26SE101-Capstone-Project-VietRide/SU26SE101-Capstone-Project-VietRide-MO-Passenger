const fs = require('fs');
const path = require('path');

const readScreen = (fileName) =>
  fs.readFileSync(path.join(__dirname, fileName), 'utf8');

describe('profile settings visibility', () => {
  const settingsSource = readScreen('SettingsScreen.tsx');
  const securitySource = readScreen('SecurityScreen.tsx');

  it('removes the privacy and legal section while keeping account security', () => {
    expect(settingsSource).toContain("t('settings.security.accountTitle')");
    expect(settingsSource).not.toContain('settings.legal.');
    expect(settingsSource).not.toContain('ShieldCheck');
  });

  it('keeps only the account section on the security screen', () => {
    expect(securitySource).toContain("t('security.accountSection')");
    expect(securitySource).toContain("t('security.loginEmail')");
    expect(securitySource).toContain("t('security.accountStatus')");
    expect(securitySource).toContain("t('security.changePassword.title')");

    expect(securitySource).not.toContain('security.hero');
    expect(securitySource).not.toContain('security.currentDeviceSection');
    expect(securitySource).not.toContain('security.moreControlsSection');
    expect(securitySource).not.toContain('DeviceMobile');
    expect(securitySource).not.toContain('WarningCircle');
  });
});
