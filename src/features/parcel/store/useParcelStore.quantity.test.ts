import { useParcelStore } from './useParcelStore';

describe('Parcel draft quantity invariant', () => {
  beforeEach(() => {
    useParcelStore.getState().resetParcel();
  });

  it('defaults and resets quantity to one', () => {
    expect(useParcelStore.getState().quantity).toBe(1);
    useParcelStore.getState().setPackage({ quantity: 25 });
    useParcelStore.getState().resetParcel();
    expect(useParcelStore.getState().quantity).toBe(1);
  });

  it.each([0, 1.5, 10_001])('rejects invalid quantity %p', (quantity) => {
    expect(() => useParcelStore.getState().setPackage({ quantity })).toThrow(
      'Parcel quantity',
    );
    expect(useParcelStore.getState().quantity).toBe(1);
  });
});
