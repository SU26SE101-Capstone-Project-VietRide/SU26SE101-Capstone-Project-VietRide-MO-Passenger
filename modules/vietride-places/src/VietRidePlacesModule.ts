import { requireNativeModule } from 'expo-modules-core';
import type { NativeVietRidePlacesModule } from './VietRidePlaces.types';

/**
 * Raw native bridge. Application code must import the typed facade under
 * `@shared/places` instead of this module.
 */
export default requireNativeModule<NativeVietRidePlacesModule>('VietRidePlaces');
