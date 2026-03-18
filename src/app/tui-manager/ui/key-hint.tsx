import { For } from 'solid-js';
import { useTheme } from '../context/theme';

export type Hint = { key: string; label: string };

export const KeyHints = (props: { hints: Hint[] }) => {
  const { theme } = useTheme();
  return (
    <box flexDirection="row">
      <For each={props.hints}>
        {(h) => (
          <>
            <text flexShrink={0} wrapMode="none" fg={theme.muted}>
              <b>{h.key}</b>
            </text>
            <text flexShrink={0} wrapMode="none" fg={theme.dim}>
              {` ${h.label}  `}
            </text>
          </>
        )}
      </For>
    </box>
  );
};
