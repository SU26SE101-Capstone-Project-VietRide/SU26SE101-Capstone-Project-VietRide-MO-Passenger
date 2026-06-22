import { z } from 'zod';

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
  .min(1, 'Full name is required.')
  .max(MAX_DISPLAY_NAME_LENGTH, 'Full name is too long.')
  .transform(normalizeDisplayName);

const phoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value ?? '')
  .refine((value) => value.length === 0 || isValidVietnamPhone(value), {
    message: 'Enter a valid Vietnam phone number, e.g. +84901234567.',
  })
  .transform((value) => (value ? normalizeVietnamPhone(value) : value));

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, 'Password must be at least 8 characters.')
  .max(MAX_PASSWORD_LENGTH, 'Password is too long.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/\d/, 'Include at least one number.');

export const editProfileSchema = z.object({
  displayName: displayNameSchema,
  phone: phoneSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .superRefine((data, context) => {
    if (data.currentPassword === data.newPassword) {
      context.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'New password must be different from the current password.',
      });
    }

    if (data.newPassword !== data.confirmPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
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
