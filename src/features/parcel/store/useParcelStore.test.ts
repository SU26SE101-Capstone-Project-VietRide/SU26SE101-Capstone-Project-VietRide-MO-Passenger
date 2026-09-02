import { useParcelStore } from './useParcelStore';

describe('useParcelStore locations', () => {
  beforeEach(() => {
    useParcelStore.getState().resetParcel();
  });

  it('keeps the visible package size synchronized with manually typed dimensions', () => {
    useParcelStore.getState().setPackage({ size: 'medium' });
    useParcelStore.getState().setPackage({
      lengthCm: 20,
      widthCm: 15,
      heightCm: 10,
    });

    expect(useParcelStore.getState()).toMatchObject({
      size: 'small',
      lengthCm: 20,
      widthCm: 15,
      heightCm: 10,
    });

    useParcelStore.getState().setPackage({
      lengthCm: 50,
      widthCm: 40,
      heightCm: 30,
    });

    expect(useParcelStore.getState().size).toBe('large');
  });

  it('keeps the same province when origin and destination wards differ', () => {
    useParcelStore
      .getState()
      .setFromLocation('Phường 1, TP.HCM', '79', '26734');
    useParcelStore.getState().setToLocation('Phường 2, TP.HCM', '79', '26737');

    expect(useParcelStore.getState()).toMatchObject({
      fromLocationCode: '79',
      toLocationCode: '79',
      fromWardCode: '26734',
      toWardCode: '26737',
    });
  });

  it('swaps province and ward codes together', () => {
    useParcelStore
      .getState()
      .setFromLocation('Phường 1, TP.HCM', '79', '26734');
    useParcelStore.getState().setToLocation('Hà Nội', '01', '');

    useParcelStore.getState().swapLocations();

    expect(useParcelStore.getState()).toMatchObject({
      fromCity: 'Hà Nội',
      toCity: 'Phường 1, TP.HCM',
      fromLocationCode: '01',
      toLocationCode: '79',
      fromWardCode: '',
      toWardCode: '26734',
    });
  });

  it('keeps a custom item name with the package draft and clears it on reset', () => {
    useParcelStore.getState().setPackage({
      category: 'Others',
      customItemName: 'Mô hình nhựa',
    });
    expect(useParcelStore.getState()).toMatchObject({
      category: 'Others',
      customItemName: 'Mô hình nhựa',
    });

    useParcelStore.getState().resetParcel();
    expect(useParcelStore.getState()).toMatchObject({
      category: 'Documents',
      customItemName: '',
    });
  });
});
