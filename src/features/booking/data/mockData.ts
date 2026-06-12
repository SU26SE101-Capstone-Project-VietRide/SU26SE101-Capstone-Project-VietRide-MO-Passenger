/**
 * VietRide Booking — Mock Data
 *
 * Sample data matching the Figma design for development and UI prototyping.
 */

import type {
  BusTrip,
  SeatRow,
  PopularRoute,
  RecentSearch,
  DropOffPoint,
  PickUpPoint,
  ContactInfo,
  BookingResult,
} from '../types';

// ─── Mock Trips ───────────────────────────────────────────
export const MOCK_TRIPS: BusTrip[] = [
  {
    id: 'trip-1',
    operatorBadge: '⭐ VietRide',
    departureCity: 'Hanoi',
    arrivalCity: 'Sapa',
    departureTime: '07:00',
    arrivalTime: '13:30',
    departureStation: 'Nuoc Ngam Station',
    arrivalStation: 'Sapa Bus Station',
    price: 350000,
    busType: 'sleeper',
    busLabel: 'Luxury Sleeper 34s',
    seatsLeft: 12,
    totalSeats: 34,
    durationHours: 6.5,
  },
  {
    id: 'trip-2',
    operatorBadge: '🚌 Hoang Long',
    departureCity: 'Hanoi',
    arrivalCity: 'Sapa',
    departureTime: '09:00',
    arrivalTime: '14:00',
    departureStation: 'My Dinh Station',
    arrivalStation: 'Sapa Center',
    price: 420000,
    busType: 'limousine',
    busLabel: 'Limousine 9s',
    seatsLeft: 2,
    totalSeats: 9,
    durationHours: 5,
  },
  {
    id: 'trip-3',
    operatorBadge: '🚌 Sao Viet',
    departureCity: 'Hanoi',
    arrivalCity: 'Sapa',
    departureTime: '22:00',
    arrivalTime: '04:30',
    departureStation: 'Nuoc Ngam Station',
    arrivalStation: 'Sapa Bus Station',
    price: 300000,
    busType: 'standard',
    busLabel: 'Standard Sleeper 40s',
    seatsLeft: 12,
    totalSeats: 40,
    durationHours: 6.5,
  },
];

// ─── Mock Seat Map ────────────────────────────────────────
export const MOCK_SEAT_MAP: SeatRow[] = [
  {
    rowLabel: 'A',
    leftSeats: [
      { id: 'A1', label: 'A1', status: 'sold' },
      { id: 'A2', label: 'A2', status: 'sold' },
    ],
    rightSeats: [
      { id: 'A3', label: 'A3', status: 'available' },
      { id: 'A4', label: 'A4', status: 'available' },
    ],
  },
  {
    rowLabel: 'B',
    leftSeats: [
      { id: 'B1', label: 'B1', status: 'available' },
      { id: 'B2', label: 'B2', status: 'selected' },
    ],
    rightSeats: [
      { id: 'B3', label: 'B3', status: 'available' },
      { id: 'B4', label: 'B4', status: 'sold' },
    ],
  },
  {
    rowLabel: 'C',
    leftSeats: [
      { id: 'C1', label: 'C1', status: 'available' },
      { id: 'C2', label: 'C2', status: 'available' },
    ],
    rightSeats: [
      { id: 'C3', label: 'C3', status: 'selected' },
      { id: 'C4', label: 'C4', status: 'available' },
    ],
  },
  {
    rowLabel: 'D',
    leftSeats: [
      { id: 'D1', label: 'D1', status: 'sold' },
      { id: 'D2', label: 'D2', status: 'sold' },
    ],
    rightSeats: [
      { id: 'D3', label: 'D3', status: 'sold' },
      { id: 'D4', label: 'D4', status: 'sold' },
    ],
  },
  {
    rowLabel: 'E',
    leftSeats: [
      { id: 'E1', label: 'E1', status: 'available' },
      { id: 'E2', label: 'E2', status: 'selected' },
    ],
    rightSeats: [
      { id: 'E3', label: 'E3', status: 'available' },
      { id: 'E4', label: 'E4', status: 'sold' },
    ],
  },
  {
    rowLabel: 'F',
    leftSeats: [
      { id: 'F1', label: 'F1', status: 'sold' },
      { id: 'F2', label: 'F2', status: 'sold' },
    ],
    rightSeats: [
      { id: 'F3', label: 'F3', status: 'sold' },
      { id: 'F4', label: 'F4', status: 'sold' },
    ],
  },
];

// ─── Popular Routes ───────────────────────────────────────
export const MOCK_POPULAR_ROUTES: PopularRoute[] = [
  {
    id: 'route-1',
    from: 'Hanoi',
    to: 'Da Lat',
    price: 'From 250k VND',
    gradientColors: ['#0A7EA4', '#38B2D8'],
  },
  {
    id: 'route-2',
    from: 'HCMC',
    to: 'Nha Trang',
    price: 'From 300k VND',
    gradientColors: ['#065A76', '#0A7EA4'],
  },
];

// ─── Recent Searches ──────────────────────────────────────
export const MOCK_RECENT_SEARCHES: RecentSearch[] = [
  { id: 'rs-1', route: 'Hanoi to Sapa', date: 'Today, 20 Oct' },
  { id: 'rs-2', route: 'HCMC to Da Lat', date: 'Tomorrow, 21 Oct' },
  { id: 'rs-3', route: 'Hanoi to Hai Phong', date: '22 Oct' },
];

// ─── Pick-up Points ──────────────────────────────────────
export const MOCK_PICK_UP_POINTS: PickUpPoint[] = [
  {
    id: 'pu-1',
    name: 'Nuoc Ngam Station',
    address: '1 Ngoc Hoi, Hoang Mai',
    time: '21:30',
    status: 'current',
  },
  {
    id: 'pu-2',
    name: 'My Dinh Station',
    address: '20 Pham Hung, Nam Tu Liem',
    time: '22:00',
    status: 'available',
  },
  {
    id: 'pu-3',
    name: 'Gia Lam Station',
    address: '9 Ngo Gia Kham, Long Bien',
    time: '22:30',
    status: 'available',
  },
];

// ─── Drop-off Points ─────────────────────────────────────
export const MOCK_DROP_OFF_POINTS: DropOffPoint[] = [
  {
    id: 'dp-1',
    name: 'District 1 Station',
    address: '123 Le Loi St, Ben Nghe Ward, D1',
    time: '08:00 AM',
    status: 'current',
  },
  {
    id: 'dp-2',
    name: 'Thu Thiem Hub',
    address: '45 Mai Chi Tho, D2',
    time: '08:30 AM',
    status: 'available',
    refundAmount: 20000,
  },
  {
    id: 'dp-3',
    name: 'Mien Dong New Bus Station',
    address: '501 Hoang Huu Nam, D9',
    time: '09:00 AM',
    status: 'available',
    refundAmount: 50000,
  },
  {
    id: 'dp-4',
    name: 'Tan Son Nhat Airport',
    address: 'Truong Son, Tan Binh',
    time: '',
    status: 'disabled',
    disabledReason: 'Upgrade not allowed for this ticket type',
  },
];

// ─── Default Contact Info ─────────────────────────────────
export const MOCK_CONTACT: ContactInfo = {
  fullName: 'Nguyen Van A',
  phoneCountryCode: '+84',
  phone: '0912 345 678',
  email: 'nhung.nguyen@example.com',
};

// ─── Mock Booking Result ──────────────────────────────────
export const MOCK_BOOKING_RESULT: BookingResult = {
  bookingRef: 'VTR-89352',
  operatorName: 'VietRide Express',
  operatorSubtitle: 'Luxury Sleeper',
  status: 'CONFIRMED',
  departureCode: 'HAN',
  departureName: 'Hanoi',
  arrivalCode: 'SAP',
  arrivalName: 'Sapa',
  departureDate: 'Oct 24, 22:30',
  departureTime: '22:30',
  seatNumber: 'A3',
  passengerName: 'Nguyen Van A',
};
