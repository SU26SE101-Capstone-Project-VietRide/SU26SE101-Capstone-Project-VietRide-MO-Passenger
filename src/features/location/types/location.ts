/**
 * BE LocationDto (camelCase JSON).
 * @see ListLocationsHandler / LocationMapper
 */
export type LocationType =
  | 'PROVINCE'
  | 'MUNICIPALITY'
  | 'WARD'
  | 'COMMUNE'
  | 'SPECIAL_ZONE';

export interface Location {
  id: string;
  code: string;
  name: string;
  type: LocationType;
  parentId: string | null;
  parentCode: string | null;
  parentName: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const isLocationRootType = (type: LocationType): boolean =>
  type === 'PROVINCE' || type === 'MUNICIPALITY';

export const isLocationLeafType = (type: LocationType): boolean =>
  type === 'WARD' || type === 'COMMUNE' || type === 'SPECIAL_ZONE';
