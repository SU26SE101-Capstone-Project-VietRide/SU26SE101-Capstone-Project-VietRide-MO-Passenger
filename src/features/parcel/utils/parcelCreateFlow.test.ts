import {
  canAdvanceFromStep1,
  canAdvanceFromStep2,
  canAdvanceFromStep3,
  canLoadParcelDeliveryOptions,
  canSubmitStep4,
  isParcelRouteGateActive,
  resolveParcelRouteChangeWizardState,
} from './parcelCreateFlow';

describe('parcelCreateFlow', () => {
  describe('isParcelRouteGateActive', () => {
    it('returns true when either location is missing or empty', () => {
      expect(isParcelRouteGateActive('', '79')).toBe(true);
      expect(isParcelRouteGateActive('79', '')).toBe(true);
      expect(isParcelRouteGateActive(null, '79')).toBe(true);
      expect(isParcelRouteGateActive('79', null)).toBe(true);
    });

    it('returns false when both location codes exist', () => {
      expect(isParcelRouteGateActive('79', '71')).toBe(false);
    });
  });

  describe('resolveParcelRouteChangeWizardState', () => {
    it('returns to station selection when the sending area changes or the route swaps', () => {
      expect(resolveParcelRouteChangeWizardState(4, 4, 'from')).toEqual({
        step: 1,
        highestStepReached: 1,
      });
      expect(resolveParcelRouteChangeWizardState(3, 4, 'swap')).toEqual({
        step: 1,
        highestStepReached: 1,
      });
    });

    it('keeps package progress but requires a new delivery option after receiving-area changes', () => {
      expect(resolveParcelRouteChangeWizardState(4, 4, 'to')).toEqual({
        step: 3,
        highestStepReached: 3,
      });
      expect(resolveParcelRouteChangeWizardState(2, 4, 'to')).toEqual({
        step: 2,
        highestStepReached: 3,
      });
    });
  });

  describe('canAdvanceFromStep1', () => {
    it('requires origin station, departure date, and both locations', () => {
      expect(
        canAdvanceFromStep1({
          fromLocationCode: '79',
          toLocationCode: '71',
          originStation: {
            id: 'station-1',
            name: 'Bến xe Miền Tây',
            address: '123 An Dương Vương',
            distance: null,
            city: 'TP. Hồ Chí Minh',
          },
          departureDate: '2026-09-02',
        }),
      ).toBe(true);

      expect(
        canAdvanceFromStep1({
          fromLocationCode: '79',
          toLocationCode: '71',
          originStation: null,
          departureDate: '2026-09-02',
        }),
      ).toBe(false);

      expect(
        canAdvanceFromStep1({
          fromLocationCode: '79',
          toLocationCode: '71',
          originStation: {
            id: 'station-1',
            name: 'Bến xe Miền Tây',
            address: '123 An Dương Vương',
            distance: null,
            city: 'TP. Hồ Chí Minh',
          },
          departureDate: '',
        }),
      ).toBe(false);
    });
  });

  describe('canAdvanceFromStep2', () => {
    it('requires valid dimensions and weight', () => {
      expect(
        canAdvanceFromStep2({
          dimensionsValid: true,
          weightValid: true,
          isCustomCategory: false,
        }),
      ).toBe(true);

      expect(
        canAdvanceFromStep2({
          dimensionsValid: false,
          weightValid: true,
          isCustomCategory: false,
        }),
      ).toBe(false);

      expect(
        canAdvanceFromStep2({
          dimensionsValid: true,
          weightValid: false,
          isCustomCategory: false,
        }),
      ).toBe(false);
    });

    it('requires customItemName if category is Others', () => {
      expect(
        canAdvanceFromStep2({
          dimensionsValid: true,
          weightValid: true,
          isCustomCategory: true,
          customItemName: 'Sách cổ',
        }),
      ).toBe(true);

      expect(
        canAdvanceFromStep2({
          dimensionsValid: true,
          weightValid: true,
          isCustomCategory: true,
          customItemName: '',
        }),
      ).toBe(false);
    });
  });

  describe('canLoadParcelDeliveryOptions', () => {
    it('does not query trips while the user is still editing parcel fit', () => {
      expect(canLoadParcelDeliveryOptions(1, true, true)).toBe(false);
      expect(canLoadParcelDeliveryOptions(2, true, true)).toBe(false);
    });

    it('queries from delivery selection onward only with valid measurements', () => {
      expect(canLoadParcelDeliveryOptions(3, true, true)).toBe(true);
      expect(canLoadParcelDeliveryOptions(4, true, true)).toBe(true);
      expect(canLoadParcelDeliveryOptions(3, false, true)).toBe(false);
      expect(canLoadParcelDeliveryOptions(3, true, false)).toBe(false);
    });
  });

  describe('canAdvanceFromStep3', () => {
    it('requires selected trip, selected point, and usable quote', () => {
      expect(
        canAdvanceFromStep3({
          selectedTripId: 'trip-1',
          selectedDropoffPointKey: 'trip-1:STATION:station-1',
          isQuoteUsable: true,
        }),
      ).toBe(true);

      expect(
        canAdvanceFromStep3({
          selectedTripId: 'trip-1',
          selectedDropoffPointKey: 'trip-1:STATION:station-1',
          isQuoteUsable: false,
        }),
      ).toBe(false);

      expect(
        canAdvanceFromStep3({
          selectedTripId: null,
          selectedDropoffPointKey: null,
          isQuoteUsable: true,
        }),
      ).toBe(false);
    });
  });

  describe('canSubmitStep4', () => {
    const validBase = {
      recipientName: 'Nguyễn Văn A',
      recipientPhone: '0901234567',
      recipientEmail: 'a@example.com',
      hasSelectedOption: true,
      isQuoteUsable: true,
      promoError: null,
      isPhotoUploading: false,
      isCreating: false,
      isPaying: false,
    };

    it('returns true when all required fields and states are valid', () => {
      expect(canSubmitStep4(validBase)).toBe(true);
    });

    it('returns false when recipient phone or email is invalid', () => {
      expect(
        canSubmitStep4({
          ...validBase,
          recipientPhone: '12345',
        }),
      ).toBe(false);

      expect(
        canSubmitStep4({
          ...validBase,
          recipientEmail: 'invalid-email',
        }),
      ).toBe(false);
    });

    it('returns false during in-flight operations', () => {
      expect(canSubmitStep4({ ...validBase, isPhotoUploading: true })).toBe(
        false,
      );
      expect(canSubmitStep4({ ...validBase, isCreating: true })).toBe(false);
      expect(canSubmitStep4({ ...validBase, isPaying: true })).toBe(false);
    });
  });
});
