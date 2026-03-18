import { useKeyboard } from '@opentui/solid';
import { useTheme } from '../context/theme';

/**
 * Inline filter input bar rendered at the top of the log panel.
 * Captures all keypresses while active and forwards the query string
 * to the caller via `onUpdate`.
 *
 * Syntax hint shown to the right of the input.
 */
export const FilterBar = (props: {
  value: string;
  onUpdate: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) => {
  const { theme } = useTheme();

  useKeyboard((key) => {
    if (key.name === 'escape') {
      props.onCancel();
      return;
    }
    if (key.name === 'return') {
      props.onSubmit();
      return;
    }
    if (key.name === 'backspace') {
      props.onUpdate(props.value.slice(0, -1));
      return;
    }
    // Ctrl+U: clear input
    if (key.ctrl && key.name === 'u') {
      props.onUpdate('');
      return;
    }
    // Accept printable characters
    if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      props.onUpdate(props.value + key.sequence);
    }
  });

  return (
    <box flexDirection="row" height={1} flexShrink={0}>
      <text flexShrink={0} wrapMode="none" fg={theme.running}>
        {'/ '}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
        {props.value}
      </text>
      <text flexShrink={0} fg={theme.running}>
        █
      </text>
      <box flexGrow={1} />
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        @name !exclude "phrase" level:error
      </text>
    </box>
  );
};
