import {
  createBookingEntryKey,
  initializeBookingEntry,
  recentSearchToPrefill,
  resolveRecentSearchDate,
  toRecentSearchInput,
} from './bookingDiscovery';

describe('booking discovery actions', () => {
  it('normalizes a replay date and rejects past searches', () => {
    const now = new Date('2026-07-14T12:00:00+07:00');

    expect(resolveRecentSearchDate({ date: '2026-07-14', savedAt: now.getTime() }, now)).toEqual({
      status: 'valid',
      date: '14/07/2026',
    });
    expect(resolveRecentSearchDate({ date: '13/07/2026', savedAt: now.getTime() }, now)).toEqual({
      status: 'past_date',
    });
  });
  it('rejects dates using the Vietnam business-day boundary', () => {
    const beforeMidnight = new Date('2026-07-13T16:59:59Z');
    const atMidnight = new Date('2026-07-13T17:00:00Z');

    expect(resolveRecentSearchDate({
      date: '2026-07-13',
      savedAt: beforeMidnight.getTime(),
    }, beforeMidnight)).toEqual({
      status: 'valid',
      date: '13/07/2026',
    });
    expect(resolveRecentSearchDate({
      date: '2026-07-13',
      savedAt: atMidnight.getTime(),
    }, atMidnight)).toEqual({ status: 'past_date' });
  });


  it('resolves legacy relative dates against the time they were saved', () => {
    const savedAt = new Date('2026-07-13T18:00:00+07:00').getTime();
    const now = new Date('2026-07-14T09:00:00+07:00');

    expect(resolveRecentSearchDate({ date: 'Tomorrow', savedAt }, now)).toEqual({
      status: 'valid',
      date: '14/07/2026',
    });
    expect(resolveRecentSearchDate({ date: 'Today', savedAt }, now)).toEqual({
      status: 'past_date',
    });
  });

  it('creates an absolute recent-search date before persistence', () => {
    const input = toRecentSearchInput({
      from: 'Hà Nội',
      to: 'Đà Nẵng',
      originLocationCode: '01',
      destinationLocationCode: '48',
      originWardCode: '',
      destinationWardCode: '',
      originStationId: '',
      destinationStationId: '',
      originStationName: '',
      destinationStationName: '',
      date: 'Today',
      passengers: 2,
    }, new Date('2026-07-14T12:00:00+07:00'));

    expect(input).toMatchObject({ date: '2026-07-14', passengers: 2 });
  });

  it('clamps discovery passenger counts to the backend booking limit', () => {
    const input = toRecentSearchInput({
      from: 'Ho Chi Minh City',
      to: 'Da Lat',
      originLocationCode: '79',
      destinationLocationCode: '68',
      originWardCode: '',
      destinationWardCode: '',
      originStationId: '',
      destinationStationId: '',
      originStationName: '',
      destinationStationName: '',
      date: 'Today',
      passengers: 9,
    }, new Date('2026-07-14T12:00:00+07:00'));

    expect(input?.passengers).toBe(5);
  });

  it('preserves matching location codes in recent searches', () => {
    const now = new Date('2026-07-14T12:00:00+07:00');
    const input = toRecentSearchInput({
      from: 'Thành phố Hồ Chí Minh',
      to: 'Thành phố Hồ Chí Minh',
      originLocationCode: '79',
      destinationLocationCode: '79',
      originWardCode: '',
      destinationWardCode: '',
      originStationId: '',
      destinationStationId: '',
      originStationName: '',
      destinationStationName: '',
      date: 'Today',
      passengers: 2,
    }, now);

    expect(input).toMatchObject({
      fromCode: '79',
      toCode: '79',
    });

    expect(recentSearchToPrefill({
      ...input!,
      id: 'same-city',
      savedAt: now.getTime(),
    }, now)).toMatchObject({
      status: 'applied',
      prefill: {
        originLocationCode: '79',
        destinationLocationCode: '79',
      },
    });
  });

  it('does not apply an expired recent search to the booking store', () => {
    expect(recentSearchToPrefill({
      id: 'old',
      fromCode: 'HN',
      fromName: 'Hà Nội',
      toCode: 'DN',
      toName: 'Đà Nẵng',
      date: '13/07/2026',
      passengers: 1,
      savedAt: new Date('2026-07-13T00:00:00+07:00').getTime(),
    }, new Date('2026-07-14T00:00:00+07:00'))).toEqual({ status: 'past_date' });
  });

  it('resets before carrying a pending voucher to the existing validator', () => {
    const events: string[] = [];

    initializeBookingEntry({
      type: 'promotion',
      pendingVoucher: { voucherId: 'voucher-1', code: ' ride20 ' },
    }, {
      resetFlowPreservingSearch: () => events.push('reset'),
      setVoucherCode: (code) => events.push(`voucher:${code}`),
    });

    expect(events).toEqual(['reset', 'voucher:RIDE20']);
  });

  it('changes the initialization key when a promotion or search field changes', () => {
    const base = {
      from: 'Ha Noi',
      to: 'Da Nang',
      originLocationCode: '01',
      destinationLocationCode: '48',
      originWardCode: '',
      destinationWardCode: '',
      originStationId: '',
      destinationStationId: '',
      originStationName: '',
      destinationStationName: '',
      date: '20/07/2026',
      passengers: 1,
    };
    const searchKey = createBookingEntryKey(base, { type: 'search' });
    const promotionKey = createBookingEntryKey(base, {
      type: 'promotion',
      pendingVoucher: { voucherId: 'voucher-1', code: 'ride20' },
    });

    expect(promotionKey).not.toBe(searchKey);
    expect(createBookingEntryKey({ ...base, passengers: 2 }, { type: 'search' }))
      .not.toBe(searchKey);
  });
});
