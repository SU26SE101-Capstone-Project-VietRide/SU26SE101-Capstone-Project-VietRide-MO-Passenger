import {
  apiFieldErrors,
  forgotPasswordSchema,
  loginSchema,
  normalizeAuthIdentifier,
  normalizeVietnamPhone,
  registerSchema,
  resetPasswordSchema,
} from './authValidation';

describe('authValidation', () => {
  it('normalizes login email', () => {
    const parsed = loginSchema.safeParse({
      email: ' USER@Example.COM ',
      password: 'secret',
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.email).toBe('user@example.com');
  });

  it('normalizes Vietnam phone numbers for backend register payloads', () => {
    expect(normalizeVietnamPhone('090 123 4567')).toBe('+84901234567');

    const parsed = registerSchema.safeParse({
      displayName: ' Nguyen   Van A ',
      email: 'USER@example.com',
      phone: '090 123 4567',
      password: 'pass1234',
      confirmPassword: 'pass1234',
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.displayName).toBe('Nguyen Van A');
    expect(parsed.data.email).toBe('user@example.com');
    expect(parsed.data.phone).toBe('+84901234567');
  });

  it('rejects invalid Vietnam phone numbers', () => {
    const parsed = registerSchema.safeParse({
      displayName: 'Nguyen Van A',
      email: 'user@example.com',
      phone: '12345',
      password: 'pass1234',
      confirmPassword: 'pass1234',
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    expect(parsed.error.issues.some((issue) => issue.path[0] === 'phone'))
      .toBe(true);
  });

  it('normalizes forgot-password email', () => {
    expect(normalizeAuthIdentifier('0901234567')).toBe('+84901234567');

    const parsed = forgotPasswordSchema.parse({
      email: ' USER@example.COM ',
    });

    expect(parsed.email).toBe('user@example.com');
  });

  it('validates reset password confirmation', () => {
    const parsed = resetPasswordSchema.safeParse({
      password: 'pass1234',
      confirmPassword: 'pass1234',
    });

    expect(parsed.success).toBe(true);
  });

  it('maps backend field errors to app-owned copy', () => {
    const errors = apiFieldErrors<'email'>(
      [{ field: 'Email', message: 'Email is invalid.' }],
      { email: 'email' },
    );

    expect(errors.email).toBe('auth.validation.fieldInvalid');
  });
});
