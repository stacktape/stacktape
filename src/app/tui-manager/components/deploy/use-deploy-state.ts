import { createSignal, onCleanup } from 'solid-js';
import { tuiState } from '../../state';
import type { TuiState } from '../../types';

export const createTuiSignal = <T>(selector: (s: TuiState) => T): (() => T) => {
  const [value, setValue] = createSignal<T>(selector(tuiState.getSnapshot()));
  const unsub = tuiState.subscribe((state: TuiState) => {
    setValue(() => selector(state));
  });
  onCleanup(() => unsub());
  return value as () => T;
};
