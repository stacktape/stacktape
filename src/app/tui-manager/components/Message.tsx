import type { TuiMessage, TuiMessageType } from '../types';
import { Box, Text } from 'ink';
import React from 'react';

type MessageProps = {
  message: TuiMessage;
};

const MESSAGE_ICONS: Record<TuiMessageType, { symbol: string; color: string }> = {
  info: { symbol: 'ℹ', color: 'cyan' },
  success: { symbol: '✔', color: 'green' },
  error: { symbol: '✖', color: 'red' },
  warn: { symbol: '⚠', color: 'yellow' },
  debug: { symbol: '⚙', color: 'gray' },
  hint: { symbol: '💡', color: 'blue' },
  start: { symbol: '▶', color: 'magenta' },
  announcement: { symbol: '★', color: 'magenta' }
};

export const Message: React.FC<MessageProps> = ({ message }) => {
  const { symbol, color } = MESSAGE_ICONS[message.type];

  return (
    <Box>
      <Text color={color}>{symbol}</Text>
      <Text> {message.message}</Text>
    </Box>
  );
};
