import type { HookStatus, ResourceStatus } from '../types';
import { Spinner } from '@inkjs/ui';
import { Text } from 'ink';
import React from 'react';

type StatusIconProps = {
  status: ResourceStatus | HookStatus;
};

export const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <Text color="gray">○</Text>;
    case 'starting':
    case 'running':
      return <Spinner type="dots" />;
    case 'success':
      return <Text color="green">●</Text>;
    case 'error':
    case 'stopped':
      return <Text color="red">●</Text>;
    default:
      return <Text color="gray">○</Text>;
  }
};

export const CompletedIcon: React.FC<{ success: boolean }> = ({ success }) => {
  return success ? <Text color="green">✓</Text> : <Text color="red">✗</Text>;
};
