import { createSignal, onCleanup } from 'solid-js';
import { devTuiState } from '../dev-tui/state';
import type { DevTuiState } from '../dev-tui/types';

/**
 * Solid signal bridge for dev-mode TUI state.
 *
 * Subscribes to the external `devTuiState` pub/sub manager and returns a reactive
 * accessor derived via the provided `selector`.
 *
 * Replaces the previous `use-dev-state.ts` — now importable from context/.
 */
export const createDevSignal = <T>(selector: (s: DevTuiState) => T): (() => T) => {
  const [value, setValue] = createSignal<T>(selector(devTuiState.getState()));
  const unsub = devTuiState.subscribe(() => {
    setValue(() => selector(devTuiState.getState()));
  });
  onCleanup(() => unsub());
  return value as () => T;
};
