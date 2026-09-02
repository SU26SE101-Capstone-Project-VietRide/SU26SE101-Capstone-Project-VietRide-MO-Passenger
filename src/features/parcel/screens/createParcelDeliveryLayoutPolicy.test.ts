import fs from 'node:fs';
import path from 'node:path';

describe('CreateParcel delivery options responsive layout policy', () => {
  const stepSource = fs.readFileSync(
    path.join(__dirname, '../components/create/ParcelDeliveryOptionsStep.tsx'),
    'utf8',
  );

  it('keeps the trip list and action bar in normal flex flow', () => {
    expect(stepSource).toMatch(/listContainer:\s*\{\s*flex:\s*1/);
    expect(stepSource).toMatch(/bottomBar:\s*\{\s*flexShrink:\s*0/);
  });

  it('does not reserve space with a fixed bottom offset', () => {
    expect(stepSource).not.toContain('paddingBottom: 110');
    expect(stepSource).not.toMatch(
      /bottomBar:\s*\{[\s\S]*?position:\s*['"]absolute['"]/,
    );
  });
});
