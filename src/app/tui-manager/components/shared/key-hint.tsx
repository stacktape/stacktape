import { For } from 'solid-js';
import { COLORS } from './colors';

type Hint = { key: string; label: string };

// Renders a row of keyboard shortcut hints: bold key + dim description.
// Use inside a single <text wrapMode="none"> for a one-line footer,
// or pass as children of a <box flexDirection="row">.
export const KeyHints = (props: { hints: Hint[] }) => (
  <text wrapMode="none" fg={COLORS.dim}>
    <For each={props.hints}>
      {(h) => (
        <>
          <b>{h.key}</b>
          {` ${h.label}  `}
        </>
      )}
    </For>
  </text>
);
