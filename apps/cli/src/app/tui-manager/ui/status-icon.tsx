import type { TuiEventStatus } from '../types';
import { glyphs } from './glyphs';
import { Spinner } from './spinner';
import { useTheme } from './theme';

export const StatusIcon = (props: { status: TuiEventStatus; isActive?: boolean }) => {
  const { theme } = useTheme();
  if (props.status === 'success') return <text fg={theme.success}>{glyphs.success}</text>;
  if (props.status === 'error') return <text fg={theme.error}>{glyphs.error}</text>;
  if (props.status === 'warning') return <text fg={theme.warning}>{glyphs.warning}</text>;
  if (props.status === 'running' || props.isActive) return <Spinner />;
  return <text fg={theme.pending}>{glyphs.pending}</text>;
};
