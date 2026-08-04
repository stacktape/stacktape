import { createSignal, onCleanup } from 'solid-js';
import { tuiState } from '../state';
import type { TuiState } from '../types';

/**
 * Solid signal bridge for deploy/delete TUI state.
 *
 * Subscribes to the external `tuiState` pub/sub manager and returns a reactive
 * accessor derived via the provided `selector`.
 *
 * Replaces the previous `use-deploy-state.ts` — now importable from context/.
 */
export const createTuiSignal = <T>(selector: (s: TuiState) => T): (() => T) => {
  const [value, setValue] = createSignal<T>(selector(tuiState.getSnapshot()));
  const unsub = tuiState.subscribe((state: TuiState) => {
    setValue(() => selector(state));
  });
  onCleanup(() => unsub());
  return value as () => T;
};
