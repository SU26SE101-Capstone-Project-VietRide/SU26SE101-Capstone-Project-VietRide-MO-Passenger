export interface LocalSessionScope {
  userId: string | null;
  epoch: number;
}

let currentScope: LocalSessionScope = {
  userId: null,
  epoch: 0,
};

const normalizeUserId = (userId: string | null): string | null => {
  const normalized = userId?.trim();
  return normalized ? normalized : null;
};

export const getLocalSessionScope = (): LocalSessionScope => currentScope;

export const setLocalSessionUser = (userId: string | null): LocalSessionScope => {
  const normalizedUserId = normalizeUserId(userId);
  if (currentScope.userId === normalizedUserId) return currentScope;

  currentScope = {
    userId: normalizedUserId,
    epoch: currentScope.epoch + 1,
  };
  return currentScope;
};

export const isLocalSessionScopeCurrent = (
  scope: LocalSessionScope,
): boolean => (
  currentScope.epoch === scope.epoch
  && currentScope.userId === scope.userId
);
