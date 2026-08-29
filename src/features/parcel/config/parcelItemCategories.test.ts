import {
  PARCEL_ITEM_CATEGORY_OPTIONS,
  resolveParcelItemName,
  type ParcelItemCategoryLabelKey,
} from './parcelItemCategories';

const viLabels: Record<ParcelItemCategoryLabelKey, string> = {
  'parcel.categories.documents': 'Tài liệu',
  'parcel.categories.clothing': 'Quần áo',
  'parcel.categories.electronics': 'Thiết bị điện tử',
  'parcel.categories.food': 'Thực phẩm',
  'parcel.categories.others': 'Khác',
};

describe('Parcel item category presentation', () => {
  it.each(PARCEL_ITEM_CATEGORY_OPTIONS.filter(({ key }) => key !== 'Others'))(
    'sends the visible localized label for $key',
    ({ key, labelKey }) => {
      const translate = jest.fn(
        (translationKey: ParcelItemCategoryLabelKey) => viLabels[translationKey],
      );

      expect(resolveParcelItemName(key, '', translate)).toBe(viLabels[labelKey]);
      expect(translate).toHaveBeenCalledWith(labelKey);
    },
  );

  it('uses trimmed custom input for Others without sending the Others label', () => {
    const translate = jest.fn(
      (translationKey: ParcelItemCategoryLabelKey) => viLabels[translationKey],
    );

    expect(resolveParcelItemName('Others', '  Mô hình nhựa  ', translate)).toBe(
      'Mô hình nhựa',
    );
    expect(translate).not.toHaveBeenCalled();
  });
});
