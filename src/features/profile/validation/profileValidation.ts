import { z } from 'zod';
import type { TFunction } from 'i18next';

import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  apiFieldErrors,
  isValidVietnamPhone,
  normalizeDisplayName,
  normalizeVietnamPhone,
  zodFieldErrors,
  type FieldErrorMap,
} from '@features/auth/validation/authValidation';

const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'profile.validation.fullNameRequired')
  .max(MAX_DISPLAY_NAME_LENGTH, 'profile.validation.fullNameTooLong')
  .transform(normalizeDisplayName);

const phoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value ?? '')
  .refine((value) => value.length === 0 || isValidVietnamPhone(value), {
    message: 'profile.validation.phoneInvalid',
  })
  .transform((value) => (value ? normalizeVietnamPhone(value) : value));

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, 'security.validation.passwordMin')
  .max(MAX_PASSWORD_LENGTH, 'security.validation.passwordMax')
  .regex(/[A-Za-z]/, 'security.validation.passwordLetter')
  .regex(/\d/, 'security.validation.passwordNumber');

export const editProfileSchema = z.object({
  displayName: displayNameSchema,
  phone: phoneSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'security.validation.currentPasswordRequired'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'security.validation.confirmPasswordRequired'),
  })
  .superRefine((data, context) => {
    if (data.currentPassword === data.newPassword) {
      context.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'security.validation.passwordMustDiffer',
      });
    }

    if (data.newPassword !== data.confirmPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'security.validation.passwordsMismatch',
      });
    }
  });

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export type EditProfileField = keyof EditProfileFormValues;
export type ChangePasswordField = keyof ChangePasswordFormValues;

export const editProfileFieldErrors = (
  error: z.ZodError,
): FieldErrorMap<EditProfileField> => zodFieldErrors<EditProfileField>(error);

export const changePasswordFieldErrors = (
  error: z.ZodError,
): FieldErrorMap<ChangePasswordField> =>
  zodFieldErrors<ChangePasswordField>(error);

export const apiProfileFieldErrors = <Field extends string>(
  fields: Parameters<typeof apiFieldErrors<Field>>[0],
): FieldErrorMap<Field> => apiFieldErrors<Field>(fields);

const LOCAL_VALIDATION_KEY_PREFIXES = [
  'profile.validation.',
  'security.validation.',
] as const;

/** Translate local schema keys while preserving backend-provided field copy. */
export const localizeProfileFieldError = (
  message: string | undefined,
  t: TFunction,
): string | undefined => {
  if (!message) return undefined;

  return LOCAL_VALIDATION_KEY_PREFIXES.some((prefix) => message.startsWith(prefix))
    ? t(message)
    : message;
};
