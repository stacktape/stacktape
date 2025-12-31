import { Box, Text, useInput } from 'ink';
import React from 'react';

type ConfirmInputCustomProps = {
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Custom confirm input with white text color.
 * Press Y to confirm, N to cancel.
 */
export const ConfirmInputCustom: React.FC<ConfirmInputCustomProps> = ({ onConfirm, onCancel }) => {
  useInput((input) => {
    const lower = input.toLowerCase();
    if (lower === 'y') {
      onConfirm();
    } else if (lower === 'n') {
      onCancel();
    }
  });

  return (
    <Box>
      <Text color="white">(Y/n) </Text>
      <Text backgroundColor="white" color="black">
        {' '}
      </Text>
    </Box>
  );
};
