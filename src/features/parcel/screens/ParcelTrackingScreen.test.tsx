import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('ParcelTrackingScreen compatibility boundary', () => {
  it('re-exports the canonical parcel reliability tracking implementation', () => {
    const source = readFileSync(
      join(__dirname, 'ParcelTrackingScreen.tsx'),
      'utf8',
    );

    expect(source).toContain(
      "export { ParcelReliabilityScreen as ParcelTrackingScreen } from './ParcelReliabilityScreen';",
    );
  });
});
