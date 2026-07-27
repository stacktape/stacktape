import type { TuiEventStatus } from '../types';
import { Spinner } from './spinner';
import { useTheme } from '../context/theme';

export const StatusIcon = (props: { status: TuiEventStatus; isActive?: boolean }) => {
  const { theme } = useTheme();
  if (props.status === 'success') return <text fg={theme.success}>✓</text>;
  if (props.status === 'error') return <text fg={theme.error}>✗</text>;
  if (props.status === 'warning') return <text fg={theme.warning}>▲</text>;
  if (props.status === 'running' || props.isActive) return <Spinner />;
  return <text fg={theme.pending}>·</text>;
};

export const PhaseIcon = (props: { status: TuiEventStatus }) => {
  const { theme } = useTheme();
  if (props.status === 'success') return <text fg={theme.success}>✓</text>;
  if (props.status === 'error') return <text fg={theme.error}>✗</text>;
  if (props.status === 'running') return <Spinner />;
  return <text fg={theme.dim}> </text>;
};
