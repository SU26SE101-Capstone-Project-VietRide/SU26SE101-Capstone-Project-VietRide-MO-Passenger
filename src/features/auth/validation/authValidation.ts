import { z } from 'zod';

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
  .min(1, 'Email is required.')
  .max(MAX_EMAIL_LENGTH, 'Email is too long.')
  .email('Enter a valid email address.')
  .transform(normalizeEmail);

const loginPasswordSchema = z
  .string()
  .min(1, 'Password is required.')
  .max(MAX_PASSWORD_LENGTH, 'Password is too long.');

const registerPasswordSchema = loginPasswordSchema
  .min(MIN_PASSWORD_LENGTH, 'Password must be at least 8 characters.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/\d/, 'Include at least one number.');

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, 'Full name is required.')
      .max(MAX_DISPLAY_NAME_LENGTH, 'Full name is too long.')
      .transform(normalizeDisplayName),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .min(1, 'Phone number is required.')
      .refine(
        isValidVietnamPhone,
        'Enter a valid Vietnam phone number, e.g. +84901234567.',
      )
      .transform(normalizeVietnamPhone),
    password: registerPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const otpSchema = z.object({
  code: z
    .string()
    .length(AUTH_CODE_LENGTH, 'Enter the 6-digit verification code.')
    .regex(/^\d{6}$/, 'Verification code must contain digits only.'),
});

export const resetPasswordSchema = z
  .object({
    password: registerPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
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

export const apiFieldErrors = <Field extends string>(
  fields: ApiFieldError[],
  aliases: Partial<Record<string, Field>> = {},
): FieldErrorMap<Field> =>
  fields.reduce<FieldErrorMap<Field>>((nextErrors, item) => {
    const normalizedField = normalizeFieldName(item.field);
    const field = aliases[normalizedField] ?? (normalizedField as Field);

    if (!nextErrors[field]) {
      nextErrors[field] = item.message;
    }

    return nextErrors;
  }, {});
