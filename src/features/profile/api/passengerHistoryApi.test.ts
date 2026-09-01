import { apiClient } from '@shared/api/axiosInstance';
import type { ApiSuccessEnvelope } from '@shared/api/errors';
import {
  getPassengerHistory,
  parsePassengerHistoryPage,
} from './passengerHistoryApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: { get: jest.fn() },
}));

const successEnvelope = <T>(data: T): ApiSuccessEnvelope<T> => ({
  success: true,
  statusCode: 200,
  data,
});

const emptyPage = {
  items: [],
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

describe('passengerHistoryApi', () => {
  const getMock = jest.mocked(apiClient.get);

  beforeEach(() => {
    getMock.mockReset();
  });

  it('sends a strictly ordered explicit-offset range', async () => {
    getMock.mockResolvedValueOnce({ data: successEnvelope(emptyPage) });

    await expect(getPassengerHistory({
      type: 'TICKET',
      from: '2026-07-20T08:00:00Z',
      to: '2026-07-20T16:00:00+07:00',
    })).resolves.toEqual(emptyPage);
    expect(getMock).toHaveBeenCalledWith('/passenger/history', {
      params: {
        type: 'TICKET',
        from: '2026-07-20T08:00:00Z',
        to: '2026-07-20T16:00:00+07:00',
        page: 1,
        pageSize: 10,
      },
    });
  });

  it('forwards parcel status to the server without inventing extra filters', async () => {
    getMock.mockResolvedValueOnce({ data: successEnvelope(emptyPage) });

    await expect(getPassengerHistory({
      type: 'PARCEL',
      status: 'IN_TRANSIT',
    })).resolves.toEqual(emptyPage);
    expect(getMock).toHaveBeenCalledWith('/passenger/history', {
      params: {
        type: 'PARCEL',
        status: 'IN_TRANSIT',
        page: 1,
        pageSize: 10,
      },
    });
  });

  it('rejects offsetless or non-increasing ranges before a request', async () => {
    await expect(getPassengerHistory({
      type: 'TICKET',
      from: '2026-07-20T08:00:00',
    })).rejects.toThrow();
    await expect(getPassengerHistory({
      type: 'PARCEL',
      from: '2026-07-20T08:00:00Z',
      to: '2026-07-20T15:00:00+07:00',
    })).rejects.toThrow(/from must be before to/);

    expect(getMock).not.toHaveBeenCalled();
  });

  it('keeps the nested vehicle summary and nullable operational seat', () => {
    const page = parsePassengerHistoryPage({
      ...emptyPage,
      items: [{
        id: '11111111-1111-4111-8111-111111111111',
        code: 'BK-VEHICLE-01',
        tripId: '22222222-2222-4222-8222-222222222222',
        createdAt: '2026-08-12T03:00:00Z',
        totalAmount: 350_000,
        originName: 'Ho Chi Minh City',
        destinationName: 'Da Lat',
        departureDateTime: '2026-08-13T01:00:00Z',
        estimatedArrivalTime: '2026-08-13T07:00:00Z',
        paymentRedirectUrl: null,
        trackingTarget: null,
        type: 'TICKET',
        status: 'CONFIRMED',
        ticket: {
          bookingGroupId: null,
          tripDirection: 'OUTBOUND',
          routeName: 'Ho Chi Minh City - Da Lat',
          pickupPoint: {
            type: 'STOP',
            id: '44444444-4444-4444-8444-444444444444',
            displayName: 'Điểm C',
            address: null,
            plannedAt: '2026-08-13T02:00:00Z',
          },
          dropoffPoint: {
            type: 'STATION',
            id: '55555555-5555-4555-8555-555555555555',
            displayName: 'Bến D',
            address: '45 Đường D',
            plannedAt: '2026-08-13T07:00:00Z',
          },
          tickets: [{
            ticketId: '33333333-3333-4333-8333-333333333333',
            ticketCode: 'VT-VEHICLE-01',
            seatNumber: null,
            status: 'ISSUED',
            paidAmount: 350_000,
          }],
          vehicle: {
            licensePlate: '51B-123.45',
            vehicleType: {
              code: 'LIMOUSINE',
              displayName: 'Limousine',
            },
          },
        },
        parcel: null,
      }],
      totalItems: 1,
      totalPages: 1,
    }, 'TICKET');

    expect(page.items[0]).toMatchObject({
      type: 'TICKET',
      ticket: {
        vehicle: {
          licensePlate: '51B-123.45',
          vehicleType: {
            code: 'LIMOUSINE',
            displayName: 'Limousine',
          },
        },
        tickets: [{
          seatNumber: null,
        }],
        pickupPoint: {
          type: 'STOP',
          displayName: 'Điểm C',
        },
        dropoffPoint: {
          type: 'STATION',
          displayName: 'Bến D',
        },
      },
    });
  });
});
