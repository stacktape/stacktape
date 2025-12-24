// Status icon component - shows different icons based on task status

import type { TaskStatus } from '../types';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { colors, symbols } from '../theme';

type StatusIconProps = {
  status: TaskStatus;
};

export const StatusIcon = ({ status }: StatusIconProps) => {
  switch (status) {
    case 'success':
      return <Text color={colors.success}>{symbols.success}</Text>;
    case 'error':
      return <Text color={colors.error}>{symbols.error}</Text>;
    case 'warning':
      return <Text color={colors.warning}>{symbols.warning}</Text>;
    case 'active':
      return (
        <Text color={colors.primary}>
          <Spinner type="dots" />
        </Text>
      );
    case 'pending':
    default:
      return <Text color={colors.gray500}>{symbols.pending}</Text>;
  }
};
