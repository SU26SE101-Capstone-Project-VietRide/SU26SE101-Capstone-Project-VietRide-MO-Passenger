import type { Location } from '@features/location/types/location';
import { extractBookingDraft } from './bookingIntent';

const rootContractFields = {
  parentId: null,
  parentCode: null,
  parentName: null,
  createdAt: '2026-08-11T00:00:00.000+07:00',
  updatedAt: '2026-08-11T00:00:00.000+07:00',
} as const;

const locations: Location[] = [
  {
    ...rootContractFields,
    id: 'hcm',
    code: '79',
    name: 'Thành phố Hồ Chí Minh',
    type: 'MUNICIPALITY',
    isActive: true,
    sortOrder: 1,
  },
  {
    ...rootContractFields,
    id: 'lamdong',
    code: '68',
    name: 'Lâm Đồng',
    type: 'PROVINCE',
    isActive: true,
    sortOrder: 2,
  },
  {
    ...rootContractFields,
    id: 'danang',
    code: '48',
    name: 'Đà Nẵng',
    type: 'MUNICIPALITY',
    isActive: true,
    sortOrder: 3,
  },
];

describe('extractBookingDraft', () => {
  it('extracts catalog-backed Vietnamese route, date, and passenger count', () => {
    const draft = extractBookingDraft(
      'Đặt 2 vé từ Hồ Chí Minh đến Lâm Đồng ngày mai',
      locations,
      new Date('2026-07-13T12:00:00+07:00'),
    );

    expect(draft).toMatchObject({
      origin: locations[0],
      destination: locations[1],
      date: 'Tomorrow',
      passengers: 2,
      isReadyToSearch: true,
    });
  });

  it('supports location codes and ISO dates in English', () => {
    const draft = extractBookingDraft(
      'Book 3 tickets from 79 to 48 on 2026-07-20',
      locations,
      new Date('2026-07-13T12:00:00+07:00'),
    );

    expect(draft).toMatchObject({
      origin: locations[0],
      destination: locations[2],
      date: '20/07/2026',
      passengers: 3,
      isReadyToSearch: true,
    });
  });

  it('returns a partial draft without inventing missing fields', () => {
    expect(extractBookingDraft('Tôi muốn đặt vé đi Lâm Đồng', locations)).toMatchObject({
      origin: undefined,
      destination: locations[1],
      date: undefined,
      isReadyToSearch: false,
    });
  });

  it('does not create actions for ordinary policy questions', () => {
    expect(extractBookingDraft('Chính sách hoàn tiền là gì?', locations)).toBeUndefined();
    expect(extractBookingDraft('Chính sách vé xe cho trẻ em?', locations)).toBeUndefined();
  });

  it('clamps passenger count to the existing booking flow maximum', () => {
    expect(extractBookingDraft(
      'Đặt 20 vé từ 79 đến Lâm Đồng hôm nay',
      locations,
    )?.passengers).toBe(5);
  });

  it('does not navigate directly for invalid or explicitly past dates', () => {
    expect(extractBookingDraft(
      'Đặt vé từ 79 đến Lâm Đồng ngày 31/02/2026',
      locations,
      new Date('2026-07-13T12:00:00+07:00'),
    )?.isReadyToSearch).toBe(false);

    expect(extractBookingDraft(
      'Đặt vé từ 79 đến Lâm Đồng ngày 01/01/2026',
      locations,
      new Date('2026-07-13T12:00:00+07:00'),
    )?.isReadyToSearch).toBe(false);
  });

  it('rolls a valid yearless past date to the next year', () => {
    expect(extractBookingDraft(
      'Đặt vé từ 79 đến Lâm Đồng ngày 01/01',
      locations,
      new Date('2026-07-13T12:00:00+07:00'),
    )?.date).toBe('01/01/2027');
  });

  it('uses the Vietnam business date across the UTC midnight boundary', () => {
    expect(extractBookingDraft(
      'Đặt vé từ 79 đến Lâm Đồng ngày 13/07/2026',
      locations,
      new Date('2026-07-13T16:59:59Z'),
    )?.date).toBe('13/07/2026');

    expect(extractBookingDraft(
      'Đặt vé từ 79 đến Lâm Đồng ngày 13/07/2026',
      locations,
      new Date('2026-07-13T17:00:00Z'),
    )?.isReadyToSearch).toBe(false);
  });

  it('merges safe booking fields across multiple user turns', () => {
    const initial = extractBookingDraft('Tôi muốn đặt vé', locations);
    const route = extractBookingDraft(
      'từ 79 đến Lâm Đồng',
      locations,
      new Date('2026-07-13T12:00:00+07:00'),
      initial,
    );
    const completed = extractBookingDraft(
      'ngày mai cho 2 người',
      locations,
      new Date('2026-07-13T12:00:00+07:00'),
      route,
    );

    expect(completed).toMatchObject({
      origin: locations[0],
      destination: locations[1],
      date: 'Tomorrow',
      passengers: 2,
      isReadyToSearch: true,
    });
  });

  it('does not attach an old draft to an unrelated follow-up', () => {
    const draft = extractBookingDraft('Đặt vé từ 79 đến Lâm Đồng', locations);
    expect(extractBookingDraft(
      'Chính sách hoàn tiền thế nào?',
      locations,
      new Date(),
      draft,
    )).toBeUndefined();
  });
});
