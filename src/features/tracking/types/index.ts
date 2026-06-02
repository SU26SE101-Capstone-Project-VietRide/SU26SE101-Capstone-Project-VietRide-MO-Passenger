export interface ActiveTrip {
  id: string;
  route: string;
  departureTime: string;
  expectedArrivalTime: string;
  status: 'scheduled' | 'boarding' | 'in_transit' | 'arrived';
  driverName: string;
  driverAvatar: string | null;
  licensePlate: string;
  busNumber: string;
  rating: number;
  fromStationName: string;
  toStationName: string;
  fromCity: string;
  toCity: string;
}

export interface ActiveShipment {
  id: string;
  route: string;
  status: 'booked' | 'at_station' | 'in_transit' | 'delivered';
  date: string;
  fromStationName: string;
  toStationName: string;
}

export interface Landmark {
  title: string;
  desc: string;
  time: string;
  status: 'completed' | 'active' | 'pending';
}
