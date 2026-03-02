import { useSyncExternalStore } from 'react';
import { tuiState } from '../../state';
import type { TuiState } from '../../types';

export const useTuiState = <T>(selector: (state: TuiState) => T): T => {
  return useSyncExternalStore(
    tuiState.subscribe.bind(tuiState),
    () => selector(tuiState.getSnapshot()),
    () => selector(tuiState.getSnapshot())
  );
};

export const useFullTuiState = (): TuiState => {
  return useSyncExternalStore(tuiState.subscribe.bind(tuiState), tuiState.getSnapshot, tuiState.getSnapshot);
};
