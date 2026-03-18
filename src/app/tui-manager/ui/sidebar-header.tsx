import { useTheme } from '../context/theme';
import { createDevSignal } from '../context/dev-state';

/**
 * Sidebar header row with title on the left and keybind hints on the right.
 * Shared between startup and running sidebars.
 */
export const SidebarHeader = (props: { title: string }) => {
  const { theme } = useTheme();
  const sidebarMode = createDevSignal((s) => s.sidebarMode);

  const modeHint = () => {
    switch (sidebarMode()) {
      case 'normal':
        return 'ctrl+b collapse';
      case 'fullscreen':
        return 'ctrl+b normal';
      default:
        return '';
    }
  };

  return (
    <box flexDirection="row" height={1} flexShrink={0}>
      <text flexShrink={0} fg={theme.muted}>
        <b>{props.title}</b>
      </text>
      <box flexGrow={1} />
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        {modeHint()}
      </text>
    </box>
  );
};
