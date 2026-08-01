import { z } from 'zod';
import type { TFunction } from 'i18next';

import type { ApiFieldError } from '@shared/api/errors';

export const AUTH_CODE_LENGTH = 6;
export const MAX_EMAIL_LENGTH = 320;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_DISPLAY_NAME_LENGTH = 100;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VIETNAM_PHONE_REGEX = /^\+84\d{9,10}$/;

export type FieldErrorMap<Field extends string> = Partial<Record<Field, string>>;

export const normalizeEmail = (value: string): string =>
  value.trim().toLowerCase();

export const normalizeDisplayName = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

const stripPhoneFormatting = (value: string): string =>
  value.trim().replace(/[()\s.-]/g, '');

export const normalizeVietnamPhone = (value: string): string => {
  const raw = stripPhoneFormatting(value);

  if (raw.startsWith('+84')) {
    return `+84${raw.slice(3).replace(/\D/g, '')}`;
  }

  if (raw.startsWith('84')) {
    return `+${raw.replace(/\D/g, '')}`;
  }

  if (raw.startsWith('0')) {
    return `+84${raw.slice(1).replace(/\D/g, '')}`;
  }

  if (raw.startsWith('+')) {
    return `+${raw.slice(1).replace(/\D/g, '')}`;
  }

  return raw.replace(/\D/g, '');
};

export const isValidEmail = (value: string): boolean => {
  const email = normalizeEmail(value);
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(email);
};

export const isValidVietnamPhone = (value: string): boolean =>
  VIETNAM_PHONE_REGEX.test(normalizeVietnamPhone(value));

export const normalizeAuthIdentifier = (value: string): string =>
  isValidEmail(value) ? normalizeEmail(value) : normalizeVietnamPhone(value);

export const isValidEmailOrPhone = (value: string): boolean =>
  isValidEmail(value) || isValidVietnamPhone(value);

const emailSchema = z
  .string()
  .trim()
  .min(1, 'auth.validation.emailRequired')
  .max(MAX_EMAIL_LENGTH, 'auth.validation.emailTooLong')
  .email('auth.validation.emailInvalid')
  .transform(normalizeEmail);

const loginPasswordSchema = z
  .string()
  .min(1, 'auth.validation.passwordRequired')
  .max(MAX_PASSWORD_LENGTH, 'auth.validation.passwordTooLong');

const registerPasswordSchema = loginPasswordSchema
  .min(MIN_PASSWORD_LENGTH, 'auth.validation.passwordMin')
  .regex(/[A-Za-z]/, 'auth.validation.passwordLetter')
  .regex(/\d/, 'auth.validation.passwordNumber');

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, 'auth.validation.fullNameRequired')
      .max(MAX_DISPLAY_NAME_LENGTH, 'auth.validation.fullNameTooLong')
      .transform(normalizeDisplayName),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .min(1, 'auth.validation.phoneRequired')
      .refine(
        isValidVietnamPhone,
        'auth.validation.phoneInvalid',
      )
      .transform(normalizeVietnamPhone),
    password: registerPasswordSchema,
    confirmPassword: z.string().min(1, 'auth.validation.confirmPasswordRequired'),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'auth.validation.passwordsMismatch',
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const otpSchema = z.object({
  code: z
    .string()
    .length(AUTH_CODE_LENGTH, 'auth.validation.otpLength')
    .regex(/^\d{6}$/, 'auth.validation.otpDigits'),
});

export const resetPasswordSchema = z
  .object({
    password: registerPasswordSchema,
    confirmPassword: z.string().min(1, 'auth.validation.confirmNewPasswordRequired'),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'auth.validation.passwordsMismatch',
      });
    }
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const zodFieldErrors = <Field extends string>(
  error: z.ZodError,
  aliases: Partial<Record<string, Field>> = {},
): FieldErrorMap<Field> =>
  error.issues.reduce<FieldErrorMap<Field>>((nextErrors, issue) => {
    const rawField = issue.path[0];

    if (typeof rawField === 'string') {
      const field = aliases[rawField] ?? (rawField as Field);

      if (!nextErrors[field]) {
        nextErrors[field] = issue.message;
      }
    }

    return nextErrors;
  }, {});

const normalizeFieldName = (field: string): string =>
  field.trim().replace(/^[A-Z]/, (letter) => letter.toLowerCase());

const AUTH_FORM_FIELDS = new Set([
  'code',
  'confirmPassword',
  'currentPassword',
  'displayName',
  'email',
  'fullName',
  'newPassword',
  'otp',
  'password',
  'phone',
]);

export const apiFieldErrors = <Field extends string>(
  fields: ApiFieldError[],
  aliases: Partial<Record<string, Field>> = {},
): FieldErrorMap<Field> =>
  fields.reduce<FieldErrorMap<Field>>((nextErrors, item) => {
    const normalizedField = normalizeFieldName(item.field);
    const field = aliases[normalizedField] ?? (normalizedField as Field);

    // Field messages are backend-owned prose and may be in any locale. Keep
    // only known auth fields and map them to app-owned copy before rendering.
    if (AUTH_FORM_FIELDS.has(field) && !nextErrors[field]) {
      nextErrors[field] = 'auth.validation.fieldInvalid';
    }

    return nextErrors;
  }, {});

/** Translate app-owned validation keys and fail closed for unexpected prose. */
export const localizeAuthMessage = (
  message: string | undefined,
  t: TFunction,
): string | undefined =>
  message
    ? t(message.startsWith('auth.') ? message : 'auth.validation.fieldInvalid')
    : undefined;
