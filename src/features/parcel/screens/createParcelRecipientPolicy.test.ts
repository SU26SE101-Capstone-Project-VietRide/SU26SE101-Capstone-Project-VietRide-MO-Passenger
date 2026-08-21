import fs from 'node:fs';
import path from 'node:path';

/**
 * Static policy checks for recipient privacy in CreateParcelScreen.
 * Full screen render is heavy; this guards the review-required no-prefill rules.
 */
describe('CreateParcel recipient privacy policy', () => {
  const screenSource = fs.readFileSync(
    path.join(__dirname, 'CreateParcelScreen.tsx'),
    'utf8',
  );

  it('initializes recipient name, phone, and email as empty strings', () => {
    expect(screenSource).toMatch(
      /const \[recipientName,\s*setRecipientName\] = useState\(''\);/,
    );
    expect(screenSource).toMatch(
      /const \[recipientPhone,\s*setRecipientPhone\] = useState\(''\);/,
    );
    expect(screenSource).toMatch(
      /const \[recipientEmail,\s*setRecipientEmail\] = useState\(''\);/,
    );
  });

  it('does not include Use-my-contact handlers or copy', () => {
    expect(screenSource).not.toContain('handleUseMyContact');
    expect(screenSource).not.toContain('useMyContact');
    expect(screenSource).not.toContain('useMyContactHint');
    expect(screenSource).not.toContain('Dùng thông tin của tôi');
    expect(screenSource).not.toContain('Use my contact details');
  });

  it('marks name and phone required while keeping email optional', () => {
    expect(screenSource).toMatch(
      /label=\{t\('parcel\.form\.fullNameLabel'\)\}[\s\S]*?required/,
    );
    expect(screenSource).toMatch(
      /label=\{t\('parcel\.form\.phoneLabel'\)\}[\s\S]*?required/,
    );
    expect(screenSource).not.toMatch(
      /<Input[\s\S]*?label=\{t\('parcel\.form\.emailLabel'\)\}[\s\S]*?required[\s\S]*?\/>/,
    );
  });

  it('validates email only when entered and serializes blank as null', () => {
    expect(screenSource).not.toContain("t('parcel.validation.recipientEmailRequired')");
    expect(screenSource).toMatch(
      /if \(recipientEmail\.trim\(\) && !isValidEmail\(recipientEmail\)\) \{/,
    );
    expect(screenSource).toContain('email: recipientEmail.trim() || null');
  });

  it('sends declared value and a bounded quantity as first-class fields', () => {
    expect(screenSource).toContain('declaredValueVnd: estimatedValue ? Number(estimatedValue) : null');
    expect(screenSource).toContain('quantity,');
    expect(screenSource).toContain('Math.min(10_000, Math.max(1, parsed))');
    expect(screenSource).not.toContain('estimatedValueMetadata');
  });

  it('does not autofill recipient fields from the signed-in user profile', () => {
    expect(screenSource).not.toMatch(
      /setRecipientName\(user\?\.fullName/,
    );
    expect(screenSource).not.toMatch(
      /setRecipientPhone\(user\?\.phone/,
    );
    expect(screenSource).not.toMatch(
      /setRecipientEmail\(user\?\.email/,
    );
    expect(screenSource).not.toMatch(
      /useState\(user\?\.fullName/,
    );
    expect(screenSource).not.toMatch(
      /useState\(user\?\.phone/,
    );
    expect(screenSource).not.toMatch(
      /useState\(user\?\.email/,
    );
  });
});
