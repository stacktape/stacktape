import { useTheme } from '../context/theme';

export const ProgressBar = (props: { percent: number; width?: number }) => {
  const { theme } = useTheme();
  const w = () => props.width ?? 30;
  const filled = () => Math.round((props.percent / 100) * w());
  const filledBar = () => '█'.repeat(filled());
  const emptyBar = () => '░'.repeat(w() - filled());
  return (
    <box flexDirection="row">
      <text flexShrink={0} wrapMode="none" fg={theme.success}>
        {filledBar()}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.border}>
        {emptyBar()}
      </text>
    </box>
  );
};
