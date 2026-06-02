/**
 * Profile Feature Types
 */

export interface PaymentMethod {
  id: string;
  type: 'card' | 'momo' | 'vnpay';
  brand?: 'visa' | 'mastercard' | 'jcb';
  cardNumberMasked?: string;
  cardHolder?: string;
  phoneNumber?: string;
  providerName?: string;
  isDefault: boolean;
}

export interface NotificationSettings {
  trips: boolean;
  parcels: boolean;
  promotions: boolean;
}

export interface LoyaltyPoints {
  currentPoints: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  nextTierPoints: number;
}
