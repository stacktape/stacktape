import { Show } from 'solid-js';
import { createTuiSignal } from '../../context/deploy-state';
import { useTheme } from '../../context/theme';
import { KeyHints } from '../../ui/key-hint';
import { actionSupportsCancel } from '../../types';

type FooterProps = {
  isCancelling?: boolean;
};

export const Footer = (props: FooterProps) => {
  const { theme } = useTheme();
  const isComplete = createTuiSignal((s) => s.isComplete);
  const action = createTuiSignal((s) => s.header?.action);

  const hints = () => {
    if (isComplete()) return [{ key: 'q', label: 'exit' }];
    // Non-stack actions (script:run, synth, validate, diff) can't roll back — only offer quit.
    if (!actionSupportsCancel(action())) return [{ key: 'ctrl+c', label: 'quit' }];
    if (props.isCancelling) return [];
    const cancelLabel = action() === 'DELETING' ? 'cancel deletion' : 'cancel & rollback';
    return [
      { key: 'c', label: cancelLabel },
      { key: 'ctrl+c', label: 'quit' },
      { key: '↑↓', label: 'scroll' }
    ];
  };

  return (
    <box height={1} paddingX={1} flexShrink={0}>
      <Show
        when={!props.isCancelling}
        fallback={
          <text wrapMode="none" fg={theme.warning}>
            {action() === 'DELETING' ? 'Cancelling deletion...' : 'Rolling back deployment...'}
          </text>
        }
      >
        <KeyHints hints={hints()} />
      </Show>
    </box>
  );
};
