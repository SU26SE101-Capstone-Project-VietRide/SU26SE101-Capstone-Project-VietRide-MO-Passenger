const fs = require('fs');
const path = require('path');

const bookingPickerSource = fs.readFileSync(
  path.join(__dirname, '../booking/screens/CityPickerScreen.tsx'),
  'utf8',
);
const parcelPickerSource = fs.readFileSync(
  path.join(__dirname, '../parcel/screens/CityPickerScreen.tsx'),
  'utf8',
);

describe('province and city picker UX contract', () => {
  it.each([
    ['booking', bookingPickerSource],
    ['parcel', parcelPickerSource],
  ])(
    '%s picker uses Keyboard Controller to keep the list above the keyboard',
    (_, source) => {
      expect(source).toContain("from 'react-native-keyboard-controller'");
      expect(source).toContain('behavior="translate-with-padding"');
      expect(source).toContain('keyboardDismissMode="on-drag"');
    },
  );

  it('keeps Booking location codes out of visible picker copy and name search', () => {
    expect(bookingPickerSource).not.toContain('booking.locations.typeAndCode');
    expect(bookingPickerSource).not.toContain(
      '{province.name} · {province.code}',
    );
    expect(bookingPickerSource).not.toContain(
      'normalizeLocationSearchText(row.code)',
    );
  });

  it('keeps Parcel location codes out of visible picker copy and name search', () => {
    expect(parcelPickerSource).not.toContain('parcel.locations.typeAndCode');
    expect(parcelPickerSource).not.toContain(
      'normalizeLocationSearchText(location.code)',
    );
  });
});
