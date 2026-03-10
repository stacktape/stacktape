import { createSignal, onCleanup } from 'solid-js';
import { devTuiState } from '../../dev-tui/state';
import type { DevTuiState } from '../../dev-tui/types';

export const createDevSignal = <T>(selector: (s: DevTuiState) => T): (() => T) => {
  const [value, setValue] = createSignal<T>(selector(devTuiState.getState()));
  const unsub = devTuiState.subscribe(() => {
    setValue(() => selector(devTuiState.getState()));
  });
  onCleanup(() => unsub());
  return value as () => T;
};
