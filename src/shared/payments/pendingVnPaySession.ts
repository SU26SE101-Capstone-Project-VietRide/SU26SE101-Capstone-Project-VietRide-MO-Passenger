import * as SecureStore from 'expo-secure-store';

import { registerSessionCleanup } from '@shared/session/cleanup';
import type { PendingVnPaySession, VnPaySessionKind } from './types';

const STORAGE_KEY = 'pendingVnPaySession';
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const SESSION_KINDS = new Set<VnPaySessionKind>([
  'booking',
  'topup',
  'parcel_deposit',
  'parcel_final',
]);

let memoryCache: PendingVnPaySession | null | undefined;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export function parsePendingVnPaySession(
  raw: string,
): PendingVnPaySession | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!isNonEmptyString(parsed.sessionId)) return null;
    if (!isNonEmptyString(parsed.ownerUserId)) return null;
    if (
      typeof parsed.kind !== 'string'
      || !SESSION_KINDS.has(parsed.kind as VnPaySessionKind)
    ) {
      return null;
    }
    if (!isNonEmptyString(parsed.createdAt)) return null;
    if (!isNonEmptyString(parsed.paymentRedirectUrl)) return null;
    if (!parsed.vnpaySdk || typeof parsed.vnpaySdk !== 'object') return null;

    const sdk = parsed.vnpaySdk as Record<string, unknown>;
    if (
      !isNonEmptyString(sdk.tmnCode)
      || !isNonEmptyString(sdk.scheme)
      || typeof sdk.isSandbox !== 'boolean'
    ) {
      return null;
    }

    const businessId = isNonEmptyString(parsed.businessId)
      ? parsed.businessId.trim()
      : undefined;

    return {
      sessionId: parsed.sessionId.trim(),
      kind: parsed.kind as VnPaySessionKind,
      ...(businessId ? { businessId } : {}),
      ownerUserId: parsed.ownerUserId.trim(),
      createdAt: parsed.createdAt.trim(),
      paymentRedirectUrl: parsed.paymentRedirectUrl.trim(),
      vnpaySdk: {
        tmnCode: sdk.tmnCode.trim(),
        scheme: sdk.scheme.trim(),
        isSandbox: sdk.isSandbox,
      },
    };
  } catch {
    return null;
  }
}

export async function savePendingVnPaySession(
  session: Omit<PendingVnPaySession, 'createdAt'> & { createdAt?: string },
): Promise<PendingVnPaySession> {
  const sessionId = session.sessionId.trim();
  const ownerUserId = session.ownerUserId.trim();
  const paymentRedirectUrl = session.paymentRedirectUrl.trim();
  const tmnCode = session.vnpaySdk.tmnCode.trim();
  const scheme = session.vnpaySdk.scheme.trim();
  if (!sessionId || !ownerUserId || !paymentRedirectUrl || !tmnCode || !scheme) {
    throw new Error('PENDING_VNPAY_SESSION_INVALID');
  }

  const next: PendingVnPaySession = {
    sessionId,
    kind: session.kind,
    ...(session.businessId?.trim()
      ? { businessId: session.businessId.trim() }
      : {}),
    ownerUserId,
    createdAt: session.createdAt?.trim() || new Date().toISOString(),
    paymentRedirectUrl,
    vnpaySdk: {
      tmnCode,
      scheme,
      isSandbox: session.vnpaySdk.isSandbox,
    },
  };

  memoryCache = next;
  await SecureStore.setItemAsync(
    STORAGE_KEY,
    JSON.stringify(next),
    STORAGE_OPTIONS,
  );
  return next;
}

export async function getPendingVnPaySession(): Promise<PendingVnPaySession | null> {
  if (memoryCache !== undefined) {
    return memoryCache;
  }

  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
    if (!raw) {
      memoryCache = null;
      return null;
    }

    const parsed = parsePendingVnPaySession(raw);
    memoryCache = parsed;
    if (!parsed) {
      await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS).catch(
        () => undefined,
      );
    }
    return parsed;
  } catch {
    memoryCache = null;
    return null;
  }
}

export async function clearPendingVnPaySession(): Promise<void> {
  memoryCache = null;
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
  } catch {
    // Best-effort clear; memory stays empty for this process.
  }
}

export function resetPendingVnPaySessionMemory(): void {
  memoryCache = undefined;
}

registerSessionCleanup('pending-vnpay-session', () => {
  clearPendingVnPaySession().catch(() => undefined);
});
