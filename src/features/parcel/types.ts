export interface Station {
  id: string;
  name: string;
  address: string;
  distance: string;
  isClosest: boolean;
  rating: number;
  reviewsCount: number;
  city: string;
  workingHours: string;
  acceptingParcels: boolean;
}
