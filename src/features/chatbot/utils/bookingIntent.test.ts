import type { Location } from '@features/location/types/location';
import { extractBookingDraft } from './bookingIntent';

const locations: Location[] = [
  {
    id: 'hcm',
    code: 'HCM',
    name: 'Thành phố Hồ Chí Minh',
    type: 'MUNICIPALITY',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'dalat',
    code: 'DL',
    name: 'Đà Lạt',
    type: 'MUNICIPALITY',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'danang',
    code: 'DAD',
    name: 'Đà Nẵng',
    type: 'MUNICIPALITY',
    isActive: true,
    sortOrder: 3,
  },
];

describe('extractBookingDraft', () => {
  it('extracts catalog-backed Vietnamese route, date, and passenger count', () => {
    const draft = extractBookingDraft(
      'Đặt 2 vé từ Hồ Chí Minh đến Đà Lạt ngày mai',
      locations,
      new Date(2026, 6, 13),
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
      'Book 3 tickets from HCM to DAD on 2026-07-20',
      locations,
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
    expect(extractBookingDraft('Tôi muốn đặt vé đi Đà Lạt', locations)).toMatchObject({
      origin: undefined,
      destination: locations[1],
      date: undefined,
      isReadyToSearch: false,
    });
  });

  it('does not create actions for ordinary policy questions', () => {
    expect(extractBookingDraft('Chính sách hoàn tiền là gì?', locations)).toBeUndefined();
  });

  it('clamps passenger count to the existing booking flow maximum', () => {
    expect(extractBookingDraft(
      'Đặt 20 vé từ HCM đến Đà Lạt hôm nay',
      locations,
    )?.passengers).toBe(9);
  });

  it('does not navigate directly for invalid or explicitly past dates', () => {
    expect(extractBookingDraft(
      'Đặt vé từ HCM đến Đà Lạt ngày 31/02/2026',
      locations,
      new Date(2026, 6, 13),
    )?.isReadyToSearch).toBe(false);

    expect(extractBookingDraft(
      'Đặt vé từ HCM đến Đà Lạt ngày 01/01/2026',
      locations,
      new Date(2026, 6, 13),
    )?.isReadyToSearch).toBe(false);
  });

  it('rolls a valid yearless past date to the next year', () => {
    expect(extractBookingDraft(
      'Đặt vé từ HCM đến Đà Lạt ngày 01/01',
      locations,
      new Date(2026, 6, 13),
    )?.date).toBe('01/01/2027');
  });

  it('merges safe booking fields across multiple user turns', () => {
    const initial = extractBookingDraft('Tôi muốn đặt vé', locations);
    const route = extractBookingDraft(
      'từ HCM đến Đà Lạt',
      locations,
      new Date(2026, 6, 13),
      initial,
    );
    const completed = extractBookingDraft(
      'ngày mai cho 2 người',
      locations,
      new Date(2026, 6, 13),
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
    const draft = extractBookingDraft('Đặt vé từ HCM đến Đà Lạt', locations);
    expect(extractBookingDraft(
      'Chính sách hoàn tiền thế nào?',
      locations,
      new Date(),
      draft,
    )).toBeUndefined();
  });
});
