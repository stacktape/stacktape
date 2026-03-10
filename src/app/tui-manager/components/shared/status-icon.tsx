import type { TuiEventStatus } from '../../types';
import { Spinner } from './spinner';
import { COLORS } from './colors';

export const StatusIcon = (props: { status: TuiEventStatus; isActive?: boolean }) => {
  if (props.status === 'success') return <text fg={COLORS.success}>✓</text>;
  if (props.status === 'error') return <text fg={COLORS.error}>✗</text>;
  if (props.status === 'warning') return <text fg={COLORS.warning}>▲</text>;
  if (props.status === 'running' || props.isActive) return <Spinner />;
  return <text fg={COLORS.pending}>·</text>;
};

export const PhaseIcon = (props: { status: TuiEventStatus }) => {
  if (props.status === 'success') return <text fg={COLORS.success}>✓</text>;
  if (props.status === 'error') return <text fg={COLORS.error}>✗</text>;
  if (props.status === 'running') return <Spinner />;
  return <text fg={COLORS.dim}> </text>;
};
