/**
 * Shared constants barrel export
 */

export { appConfig } from './config';
export { ASSETS } from './assets';


/** API timeout in milliseconds */
export const API_TIMEOUT = 15_000;

/** Default pagination page size */
export const DEFAULT_PAGE_SIZE = 20;

/** Token storage key for expo-secure-store */
export const TOKEN_SERVICE_KEY = 'com.vietride.passenger.auth';

/** WebSocket reconnection settings */
export const WS_RECONNECT_DELAY = 3_000;
export const WS_MAX_RECONNECT_ATTEMPTS = 5;
