import type { Location } from '@features/location/types/location';
import { isLocationRootType } from '@features/location/types/location';
import { normalizeLocationSearchText } from '@features/location/utils/locationSearch';

interface PopularRouteDefinition {
  id: string;
  originAliases: readonly string[];
  destinationAliases: readonly string[];
}

export interface PopularRouteShortcut {
  id: string;
  originCode: string;
  originName: string;
  destinationCode: string;
  destinationName: string;
}

const DEFINITIONS: readonly PopularRouteDefinition[] = [
  {
    id: 'ha-noi-da-nang',
    originAliases: ['ha noi'],
    destinationAliases: ['da nang'],
  },
  {
    id: 'ha-noi-ho-chi-minh',
    originAliases: ['ha noi'],
    destinationAliases: ['ho chi minh'],
  },
  {
    id: 'ho-chi-minh-lam-dong',
    originAliases: ['ho chi minh'],
    destinationAliases: ['lam dong'],
  },
  {
    id: 'da-nang-hue',
    originAliases: ['da nang'],
    destinationAliases: ['hue'],
  },
];

const matchesAlias = (location: Location, aliases: readonly string[]): boolean => {
  const normalizedName = normalizeLocationSearchText(location.name);
  const normalizedCode = normalizeLocationSearchText(location.code);

  return aliases.some((alias) => {
    const normalizedAlias = normalizeLocationSearchText(alias);
    return normalizedName === normalizedAlias
      || normalizedName.endsWith(` ${normalizedAlias}`)
      || normalizedCode === normalizedAlias;
  });
};

const findActiveLocation = (
  locations: readonly Location[],
  aliases: readonly string[],
): Location | undefined =>
  locations.find((location) => (
    location.isActive
    && isLocationRootType(location.type)
    && matchesAlias(location, aliases)
  ));

/**
 * Resolve curated shortcuts against the active location catalog. A shortcut is
 * hidden until both endpoints exist; no guessed ID, fare, duration or inventory
 * enters the booking flow.
 */
export const resolvePopularRoutes = (
  locations: readonly Location[],
): PopularRouteShortcut[] =>
  DEFINITIONS.flatMap((definition) => {
    const origin = findActiveLocation(locations, definition.originAliases);
    const destination = findActiveLocation(locations, definition.destinationAliases);

    if (!origin || !destination || origin.code === destination.code) return [];

    return [{
      id: definition.id,
      originCode: origin.code,
      originName: origin.name,
      destinationCode: destination.code,
      destinationName: destination.name,
    }];
  });
