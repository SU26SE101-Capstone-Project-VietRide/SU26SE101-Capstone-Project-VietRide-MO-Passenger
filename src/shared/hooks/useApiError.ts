import { useCallback, useState } from 'react';

import { toApiError, type ApiRequestError } from '@shared/api/errors';

export function useApiError(): {
  errorMessage: string | null;
  clearError: () => void;
  handleError: (error: unknown) => ApiRequestError;
} {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const handleError = useCallback((error: unknown) => {
    const apiError = toApiError(error);
    setErrorMessage(apiError.message);
    return apiError;
  }, []);

  return {
    errorMessage,
    clearError,
    handleError,
  };
}
