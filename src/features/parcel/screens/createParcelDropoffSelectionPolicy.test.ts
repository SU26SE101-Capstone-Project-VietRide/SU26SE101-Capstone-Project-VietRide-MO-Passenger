import fs from 'node:fs';
import path from 'node:path';

describe('CreateParcel receiving-point selection policy', () => {
  const screenSource = fs.readFileSync(
    path.join(__dirname, 'CreateParcelScreen.tsx'),
    'utf8',
  );
  const cardSource = fs.readFileSync(
    path.join(__dirname, '../components/create/ParcelDeliveryOptionCard.tsx'),
    'utf8',
  );

  it('never auto-selects a trip or receiving point', () => {
    expect(screenSource).not.toContain('pickLowestFareParcelTrip');
    expect(screenSource).not.toMatch(/handleSelectTrip\(cheapestTrip/);
  });

  it('requires an explicit accessible receiving-point choice before checkout', () => {
    expect(cardSource).toContain('accessibilityRole="radio"');
    expect(screenSource).toContain("t('parcel.validation.selectDropoffPoint')");
    expect(screenSource).toMatch(
      /handleAdvanceFromStep3[\s\S]*?!selectedDropoffPoint/,
    );
  });
});
