export const PARCEL_ITEM_CATEGORY_OPTIONS = [
  { key: 'Documents', labelKey: 'parcel.categories.documents' },
  { key: 'Clothing', labelKey: 'parcel.categories.clothing' },
  { key: 'Electronics', labelKey: 'parcel.categories.electronics' },
  { key: 'Food', labelKey: 'parcel.categories.food' },
  { key: 'Others', labelKey: 'parcel.categories.others' },
] as const;

export type ParcelItemCategory =
  (typeof PARCEL_ITEM_CATEGORY_OPTIONS)[number]['key'];
export type ParcelItemCategoryLabelKey =
  (typeof PARCEL_ITEM_CATEGORY_OPTIONS)[number]['labelKey'];

export const CUSTOM_PARCEL_ITEM_CATEGORY: ParcelItemCategory = 'Others';

const CATEGORY_LABEL_KEYS: Record<
  ParcelItemCategory,
  ParcelItemCategoryLabelKey
> = {
  Documents: 'parcel.categories.documents',
  Clothing: 'parcel.categories.clothing',
  Electronics: 'parcel.categories.electronics',
  Food: 'parcel.categories.food',
  Others: 'parcel.categories.others',
};

export const resolveParcelItemName = (
  category: ParcelItemCategory,
  customItemName: string,
  translate: (key: ParcelItemCategoryLabelKey) => string,
): string => (
  category === CUSTOM_PARCEL_ITEM_CATEGORY
    ? customItemName.trim()
    : translate(CATEGORY_LABEL_KEYS[category]).trim()
);
