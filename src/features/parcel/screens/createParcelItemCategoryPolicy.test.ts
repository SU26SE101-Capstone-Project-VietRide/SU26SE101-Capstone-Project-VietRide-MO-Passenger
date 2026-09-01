import fs from 'node:fs';
import path from 'node:path';

describe('CreateParcel item category policy', () => {
  const screenSource = fs.readFileSync(
    path.join(__dirname, 'CreateParcelScreen.tsx'),
    'utf8',
  );
  const fitStepSource = fs.readFileSync(
    path.join(__dirname, '../components/create/ParcelFitStep.tsx'),
    'utf8',
  );

  it('shows a required custom item-name input only for Others', () => {
    expect(screenSource).toContain(
      'packageCategory === CUSTOM_PARCEL_ITEM_CATEGORY',
    );
    expect(fitStepSource).toMatch(
      /testID="parcel-custom-item-name-input"[\s\S]*?required[\s\S]*?onChangeText=\{onChangeCustomItemName\}/,
    );
    expect(screenSource).toContain(
      "t('parcel.validation.customItemNameRequired')",
    );
  });

  it('resolves the user-visible item name before building the BE payload', () => {
    expect(screenSource).toContain('resolveParcelItemName(');
    expect(screenSource).toContain('itemName: parcelItemName');
    expect(screenSource).not.toContain('itemName: packageCategory');
    expect(screenSource).toContain('parcelItemName={parcelItemName}');
  });
});
