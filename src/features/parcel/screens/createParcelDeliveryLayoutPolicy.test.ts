import fs from 'node:fs';
import path from 'node:path';

describe('CreateParcel delivery options responsive layout policy', () => {
  const stepSource = fs.readFileSync(
    path.join(__dirname, '../components/create/ParcelDeliveryOptionsStep.tsx'),
    'utf8',
  );

  it('keeps the trip list and action bar in normal flex flow', () => {
    expect(stepSource).toMatch(
      /container:\s*\{\s*flex:\s*1,\s*minHeight:\s*0/,
    );
    expect(stepSource).toMatch(
      /listContainer:\s*\{\s*flex:\s*1,\s*minHeight:\s*0/,
    );
    expect(stepSource).toContain('style={styles.list}');
    expect(stepSource).toContain('extraData={selectedOptionKey}');
    expect(stepSource).toMatch(/bottomBar:\s*\{\s*flexShrink:\s*0/);
  });

  it('keeps the continue action mounted and above the recycler surface', () => {
    expect(stepSource).toContain('testID="parcel-delivery-continue"');
    expect(stepSource).toMatch(
      /bottomBar:\s*\{[\s\S]*?zIndex:\s*1,[\s\S]*?elevation:\s*1/,
    );
  });

  it('does not reserve space with a fixed bottom offset', () => {
    expect(stepSource).not.toContain('paddingBottom: 110');
    expect(stepSource).not.toMatch(
      /bottomBar:\s*\{[\s\S]*?position:\s*['"]absolute['"]/,
    );
  });
});
