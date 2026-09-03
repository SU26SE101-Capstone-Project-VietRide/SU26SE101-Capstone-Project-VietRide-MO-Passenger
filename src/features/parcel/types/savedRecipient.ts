/**
 * Saved Recipient — Type Definitions
 *
 * Represents an entry in the passenger's parcel recipient address book.
 */

export type RecipientLabel = 'home' | 'office' | 'family' | 'customer' | 'other';

export interface SavedRecipient {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  label?: RecipientLabel;
  customLabel?: string;
  isDefault?: boolean;
  lastUsedAt: number;
  createdAt: number;
}

export type CreateSavedRecipientInput = Omit<
  SavedRecipient,
  'id' | 'createdAt' | 'lastUsedAt'
> & {
  id?: string;
  lastUsedAt?: number;
};

export type UpdateSavedRecipientInput = Partial<
  Omit<SavedRecipient, 'id' | 'createdAt'>
>;
