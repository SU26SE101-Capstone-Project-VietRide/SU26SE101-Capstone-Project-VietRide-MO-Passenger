import { clearSessionBoundState } from '@shared/session/cleanup';
import {
  dismissSnackbar,
  showSnackbar,
  useSnackbarStore,
} from './useSnackbarStore';

describe('useSnackbarStore', () => {
  beforeEach(() => {
    dismissSnackbar();
  });

  it('does not let a stale timer dismiss a newer snackbar', () => {
    showSnackbar({ message: 'first' });
    const firstId = useSnackbarStore.getState().current?.id;
    showSnackbar({ message: 'second' });

    dismissSnackbar(firstId);

    expect(useSnackbarStore.getState().current?.message).toBe('second');
  });

  it('clears transient feedback with the authenticated session', () => {
    showSnackbar({ message: 'private feedback' });

    clearSessionBoundState();

    expect(useSnackbarStore.getState().current).toBeNull();
  });
});
