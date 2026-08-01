import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getLocalizedApiErrorMessage,
  toApiError,
  type ApiRequestError,
} from '@shared/api/errors';

const EMPTY_ERROR_TRANSLATION_KEYS: Readonly<Record<string, string>> = {};

export function useApiError(
  featureCodeKeys: Readonly<Record<string, string>> = EMPTY_ERROR_TRANSLATION_KEYS,
): {
  errorMessage: string | null;
  clearError: () => void;
  handleError: (error: unknown) => ApiRequestError;
} {
  const { t } = useTranslation();
  const [error, setError] = useState<ApiRequestError | null>(null);
  const errorMessage = useMemo(
    () => error
      ? getLocalizedApiErrorMessage(error, t, featureCodeKeys)
      : null,
    [error, featureCodeKeys, t],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((caughtError: unknown) => {
    const apiError = toApiError(caughtError);
    setError(apiError);
    return apiError;
  }, []);

  return {
    errorMessage,
    clearError,
    handleError,
  };
}
