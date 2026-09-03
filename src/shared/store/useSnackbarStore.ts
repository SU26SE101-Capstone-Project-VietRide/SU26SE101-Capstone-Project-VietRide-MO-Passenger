import { create } from 'zustand';
import { registerSessionCleanup } from '@shared/session/cleanup';

export type SnackbarTone = 'neutral' | 'success' | 'warning' | 'error';

export interface SnackbarAction {
  label: string;
  onPress: () => void;
}

export interface SnackbarPayload {
  message: string;
  tone?: SnackbarTone;
  durationMs?: number;
  action?: SnackbarAction;
}

interface SnackbarState {
  current: (SnackbarPayload & { id: number }) | null;
  show: (payload: SnackbarPayload) => void;
  dismiss: (id?: number) => void;
}

let nextSnackbarId = 1;

export const useSnackbarStore = create<SnackbarState>(set => ({
  current: null,
  show: payload =>
    set({
      current: {
        ...payload,
        id: nextSnackbarId++,
      },
    }),
  dismiss: id => set(state => (
    id !== undefined && state.current?.id !== id
      ? state
      : { current: null }
  )),
}));

export const showSnackbar = (payload: SnackbarPayload): void => {
  useSnackbarStore.getState().show(payload);
};

export const dismissSnackbar = (id?: number): void => {
  useSnackbarStore.getState().dismiss(id);
};

registerSessionCleanup('snackbar', dismissSnackbar);
