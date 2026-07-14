/**
 * Profile Feature Types
 */

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
