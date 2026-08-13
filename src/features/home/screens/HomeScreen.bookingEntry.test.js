const fs = require('fs');
const path = require('path');

const read = (relativePath) => fs.readFileSync(
  path.join(__dirname, relativePath),
  'utf8',
);

describe('Homepage booking entry contract', () => {
  const homeSource = read('HomeScreen.tsx');
  const popularRoutesSource = read('../../booking/screens/PopularRoutesScreen.tsx');
  const promotionsSource = read('../components/PromotionsSection.tsx');

  it('opens the date picker before searching from the Home form and popular routes', () => {
    expect(homeSource.match(/screen: 'DatePicker'/g)).toHaveLength(4);
    expect(homeSource.match(/next: 'search'/g)).toHaveLength(3);
    expect(popularRoutesSource).toContain("navigation.navigate('DatePicker'");
    expect(popularRoutesSource).toContain("next: 'search'");
  });

  it('formats only the Home ticket-search dates with the dedicated locale formatter', () => {
    expect(homeSource).toContain('formatTicketSearchDate');
    expect(homeSource.match(/formatTicketSearchDate\(/g)).toHaveLength(2);
  });

  it('keeps Home promotions readable and horizontally scrollable without card actions', () => {
    expect(homeSource).toContain('<PromotionsSection />');
    expect(promotionsSource).toContain('<View\n      accessible');
    expect(promotionsSource).toContain('horizontal');
    expect(promotionsSource).not.toContain('onPromotionPress');
    expect(promotionsSource).not.toContain('onPress?.(voucherId');
  });
});
