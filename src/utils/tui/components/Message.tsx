import type { TuiMessage, TuiMessageType } from '../types';
import { Box, Text } from 'ink';
import React from 'react';

type MessageProps = {
  message: TuiMessage;
};

const MESSAGE_COLORS: Record<TuiMessageType, string> = {
  info: 'cyan',
  success: 'green',
  error: 'red',
  warn: 'yellow',
  debug: 'gray',
  hint: 'blue',
  start: 'magenta',
  announcement: 'magenta'
};

const MESSAGE_PREFIXES: Record<TuiMessageType, string> = {
  info: 'INFO',
  success: 'SUCCESS',
  error: 'ERROR',
  warn: 'WARN',
  debug: 'DEBUG',
  hint: 'HINT',
  start: 'START',
  announcement: 'ANNOUNCEMENT'
};

export const Message: React.FC<MessageProps> = ({ message }) => {
  const color = MESSAGE_COLORS[message.type];
  const prefix = MESSAGE_PREFIXES[message.type];

  return (
    <Box>
      <Text>[</Text>
      <Text color={color}>{prefix}</Text>
      <Text>] {message.message}</Text>
    </Box>
  );
};
