import fs from 'node:fs';
import path from 'node:path';

interface NavigatorContract {
  paramList: string;
  sourceFile: string;
}

const ROOT = path.resolve(__dirname, '../..');
const TYPES_FILE = path.join(__dirname, 'types.ts');

const contracts: NavigatorContract[] = [
  { paramList: 'AuthStackParamList', sourceFile: 'app/navigation/AuthNavigator.tsx' },
  { paramList: 'BookingStackParamList', sourceFile: 'features/booking/BookingNavigator.tsx' },
  { paramList: 'ParcelStackParamList', sourceFile: 'features/parcel/ParcelNavigator.tsx' },
  { paramList: 'ProfileStackParamList', sourceFile: 'features/profile/ProfileNavigator.tsx' },
  { paramList: 'MainTabParamList', sourceFile: 'app/navigation/MainTabNavigator.tsx' },
  { paramList: 'RootStackParamList', sourceFile: 'app/navigation/RootNavigator.tsx' },
];

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const extractParamNames = (source: string, typeName: string): string[] => {
  const escapedName = typeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = source.match(
    new RegExp(`export type ${escapedName} = \\{([\\s\\S]*?)^\\};`, 'm'),
  )?.[1];

  if (!block) {
    throw new Error(`Could not find navigation param list: ${typeName}`);
  }

  return Array.from(block.matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*)\??:/gm))
    .map((match) => match[1])
    .sort();
};

const extractRegisteredScreens = (source: string): string[] =>
  Array.from(source.matchAll(/<(?:Stack|Tab)\.Screen\s+name="([^"]+)"/g))
    .map((match) => match[1])
    .sort();

describe('navigation registry contract', () => {
  const typeSource = fs.readFileSync(TYPES_FILE, 'utf8');

  it.each(contracts)(
    'registers every $paramList route exactly once',
    ({ paramList, sourceFile }) => {
      const declared = extractParamNames(typeSource, paramList);
      const registered = extractRegisteredScreens(readSource(sourceFile));

      expect(registered).toEqual(declared);
      expect(new Set(registered).size).toBe(registered.length);
    },
  );

  it('keeps Assistant as a root modal action instead of a duplicate tab route', () => {
    const mainTabs = readSource('app/navigation/MainTabNavigator.tsx');
    const customTabBar = readSource('shared/components/CustomTabBar.tsx');

    expect(mainTabs).not.toMatch(/name="ChatbotTab"/);
    expect(customTabBar).toMatch(/navigation\.navigate\('Chatbot'\)/);
  });
});
