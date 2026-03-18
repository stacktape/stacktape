import { createSignal, type JSX, Show } from 'solid-js';
import { useKeyboard } from '@opentui/solid';
import { createSimpleContext } from './helper';
import { useTheme } from './theme';

type DialogEntry = {
  id: string;
  component: () => JSX.Element;
  onClose?: () => void;
};

/**
 * Stack-based dialog system (inspired by OpenCode).
 *
 * `dialog.push()` adds a modal on top of the stack.
 * `dialog.replace()` clears the stack and shows one dialog.
 * `dialog.pop()` closes the top dialog.
 * `dialog.clear()` closes all dialogs.
 */
const { provider: DialogProvider, use: useDialog } = createSimpleContext<{
  push: (component: () => JSX.Element, onClose?: () => void) => void;
  replace: (component: () => JSX.Element, onClose?: () => void) => void;
  pop: () => void;
  clear: () => void;
  isOpen: () => boolean;
  current: () => DialogEntry | undefined;
}>({
  name: 'Dialog',
  init: () => {
    const [stack, setStack] = createSignal<DialogEntry[]>([]);
    let idCounter = 0;

    const push = (component: () => JSX.Element, onClose?: () => void) => {
      const id = `dialog-${++idCounter}`;
      setStack((prev) => [...prev, { id, component, onClose }]);
    };

    const replace = (component: () => JSX.Element, onClose?: () => void) => {
      for (const entry of stack()) entry.onClose?.();
      const id = `dialog-${++idCounter}`;
      setStack([{ id, component, onClose }]);
    };

    const pop = () => {
      setStack((prev) => {
        if (prev.length === 0) return prev;
        const top = prev[prev.length - 1];
        top.onClose?.();
        return prev.slice(0, -1);
      });
    };

    const clear = () => {
      for (const entry of stack()) entry.onClose?.();
      setStack([]);
    };

    const isOpen = () => stack().length > 0;
    const current = () => {
      const s = stack();
      return s.length > 0 ? s[s.length - 1] : undefined;
    };

    return { push, replace, pop, clear, isOpen, current };
  }
});

/**
 * Renders the topmost dialog from the stack as an absolute overlay.
 * Place this once near the root of the TUI component tree.
 */
export const DialogOverlay = () => {
  const dialog = useDialog();
  const { theme } = useTheme();

  useKeyboard((key) => {
    if (!dialog.isOpen()) return;
    if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
      key.stopPropagation?.();
      dialog.pop();
    }
  });

  return (
    <Show when={dialog.current()}>
      {(entry) => (
        <box
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          justifyContent="center"
          alignItems="center"
          zIndex={100}
          backgroundColor={theme.bg}
        >
          {entry().component()}
        </box>
      )}
    </Show>
  );
};

export { DialogProvider, useDialog };
