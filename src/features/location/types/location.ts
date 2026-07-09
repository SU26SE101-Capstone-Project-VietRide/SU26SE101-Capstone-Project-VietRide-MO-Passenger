export type LocationType = 'PROVINCE' | 'MUNICIPALITY';

export interface Location {
  id: string;
  code: string;
  name: string;
  type: LocationType;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}
