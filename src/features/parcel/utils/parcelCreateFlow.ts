import {
  isValidEmail,
  isValidVietnamPhone,
} from '@features/auth/validation/authValidation';
import type { Station } from '../types';

export const PARCEL_CREATE_STEPS = [1, 2, 3, 4] as const;
export type ParcelCreateStep = (typeof PARCEL_CREATE_STEPS)[number];
export type ParcelRouteChange = 'from' | 'to' | 'swap';

export interface ParcelRouteChangeWizardState {
  step: ParcelCreateStep;
  highestStepReached: ParcelCreateStep;
}

/**
 * A sending-area change invalidates the sending station and the whole delivery
 * path. A receiving-area change keeps the already-entered package details but
 * invalidates the delivery option and checkout quote.
 */
export const resolveParcelRouteChangeWizardState = (
  currentStep: ParcelCreateStep,
  highestStepReached: ParcelCreateStep,
  change: ParcelRouteChange,
): ParcelRouteChangeWizardState => {
  if (change === 'from' || change === 'swap') {
    return { step: 1, highestStepReached: 1 };
  }

  return {
    step: currentStep >= 3 ? 3 : currentStep,
    highestStepReached: Math.min(highestStepReached, 3) as ParcelCreateStep,
  };
};

export const isParcelRouteGateActive = (
  fromLocationCode?: string | null,
  toLocationCode?: string | null,
): boolean => !fromLocationCode?.trim() || !toLocationCode?.trim();

export interface Step1ValidationInput {
  fromLocationCode?: string | null;
  toLocationCode?: string | null;
  originStation?: Station | null;
  departureDate?: string | null;
}

export const canAdvanceFromStep1 = (input: Step1ValidationInput): boolean => {
  return Boolean(
    input.fromLocationCode?.trim() &&
      input.toLocationCode?.trim() &&
      input.originStation?.id &&
      input.departureDate?.trim(),
  );
};

export interface Step2ValidationInput {
  dimensionsValid: boolean;
  weightValid: boolean;
  isCustomCategory: boolean;
  customItemName?: string | null;
}

export const canAdvanceFromStep2 = (input: Step2ValidationInput): boolean => {
  if (!input.dimensionsValid || !input.weightValid) {
    return false;
  }
  if (input.isCustomCategory && !input.customItemName?.trim()) {
    return false;
  }
  return true;
};

export const canLoadParcelDeliveryOptions = (
  step: ParcelCreateStep,
  dimensionsValid: boolean,
  weightValid: boolean,
): boolean => step >= 3 && dimensionsValid && weightValid;

export interface Step3ValidationInput {
  selectedTripId?: string | null;
  selectedDropoffPointKey?: string | null;
  isQuoteUsable: boolean;
}

export const canAdvanceFromStep3 = (input: Step3ValidationInput): boolean => {
  return Boolean(
    input.selectedTripId &&
      input.selectedDropoffPointKey &&
      input.isQuoteUsable,
  );
};

export interface Step4ValidationInput {
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  hasSelectedOption: boolean;
  isQuoteUsable: boolean;
  promoError?: string | null;
  isPhotoUploading?: boolean;
  isCreating?: boolean;
  isPaying?: boolean;
}

export const canSubmitStep4 = (input: Step4ValidationInput): boolean => {
  if (
    !input.recipientName?.trim() ||
    !input.recipientPhone?.trim() ||
    !isValidVietnamPhone(input.recipientPhone) ||
    !input.recipientEmail?.trim() ||
    !isValidEmail(input.recipientEmail)
  ) {
    return false;
  }

  if (!input.hasSelectedOption || !input.isQuoteUsable) {
    return false;
  }

  if (input.promoError) {
    return false;
  }

  if (input.isPhotoUploading || input.isCreating || input.isPaying) {
    return false;
  }

  return true;
};
