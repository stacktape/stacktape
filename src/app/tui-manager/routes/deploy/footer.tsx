import { Show } from 'solid-js';
import { createTuiSignal } from '../../context/deploy-state';
import { useTheme } from '../../context/theme';
import { KeyHints } from '../../ui/key-hint';

type FooterProps = {
  isCancelling?: boolean;
};

export const Footer = (props: FooterProps) => {
  const { theme } = useTheme();
  const isComplete = createTuiSignal((s) => s.isComplete);
  const action = createTuiSignal((s) => s.header?.action);

  const hints = () => {
    if (isComplete()) return [{ key: 'q', label: 'exit' }];
    if (props.isCancelling) return [];
    const cancelLabel = action() === 'DELETING' ? 'cancel deletion' : 'cancel & rollback';
    return [
      { key: 'c', label: cancelLabel },
      { key: 'ctrl+c', label: 'force quit' },
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
