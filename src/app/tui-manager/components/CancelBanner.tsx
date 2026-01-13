import type { TuiCancelDeployment } from '../types';
import { Spinner } from '@inkjs/ui';
import { Box, Text, useInput } from 'ink';
import React, { useCallback, useState } from 'react';

type CancelBannerProps = {
  cancelDeployment: TuiCancelDeployment;
};

/**
 * A prominent banner that allows the user to cancel a deployment by pressing 'c'.
 * Shows when a deployment failure is detected (e.g., ECS task failed to start).
 */
export const CancelBanner: React.FC<CancelBannerProps> = ({ cancelDeployment }) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleCancel = useCallback(() => {
    if (cancelDeployment.isCancelling) return;
    cancelDeployment.onCancel();
  }, [cancelDeployment]);

  useInput(
    (input) => {
      // Ignore if already cancelling
      if (cancelDeployment.isCancelling) return;

      if (isConfirming) {
        // In confirmation mode: 'y' confirms, any other key cancels confirmation
        if (input.toLowerCase() === 'y') {
          handleCancel();
        } else {
          setIsConfirming(false);
        }
      } else {
        // First press 'c' to enter confirmation mode
        if (input.toLowerCase() === 'c') {
          setIsConfirming(true);
        }
      }
    },
    { isActive: !cancelDeployment.isCancelling }
  );

  // Rollback in progress - show a cyan info banner
  if (cancelDeployment.isCancelling) {
    return (
      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">{'─'.repeat(60)}</Text>
        <Box flexDirection="row" alignItems="center">
          <Spinner type="dots" />
          <Text color="cyan" bold>
            {' '}
            Rollback in progress...
          </Text>
        </Box>
        <Text color="gray">The stack is being rolled back. This may take a few minutes.</Text>
        <Text color="gray">You can close this terminal - the rollback will continue in AWS.</Text>
        <Text color="cyan">{'─'.repeat(60)}</Text>
      </Box>
    );
  }

  // Confirmation mode - show red warning
  if (isConfirming) {
    return (
      <Box marginTop={1} flexDirection="column">
        <Text color="red">{'─'.repeat(60)}</Text>
        <Text color="red" bold>
          ⚠ Confirm cancellation
        </Text>
        <Text>
          Press{' '}
          <Text color="red" bold>
            Y
          </Text>{' '}
          to cancel deployment and trigger rollback, or any other key to go back.
        </Text>
        <Text color="red">{'─'.repeat(60)}</Text>
      </Box>
    );
  }

  // Initial state - show yellow warning with cancel option
  return (
    <Box marginTop={1} flexDirection="column">
      <Text color="yellow">{'─'.repeat(60)}</Text>
      <Text color="yellow" bold>
        ⚠ {cancelDeployment.message}
      </Text>
      <Text>
        Press{' '}
        <Text color="yellow" bold>
          C
        </Text>{' '}
        to cancel deployment and trigger rollback.
      </Text>
      <Text color="yellow">{'─'.repeat(60)}</Text>
    </Box>
  );
};
