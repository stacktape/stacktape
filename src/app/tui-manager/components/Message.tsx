/** @jsxImportSource @opentui/react */
import type { TuiMessage, TuiMessageType } from '../types';
import React from 'react';
import { stripAnsi } from '../utils';

type MessageProps = {
  message: TuiMessage;
};

const MESSAGE_ICONS: Record<TuiMessageType, { symbol: string; color: string }> = {
  info: { symbol: 'i', color: 'cyan' },
  success: { symbol: '+', color: 'green' },
  error: { symbol: 'x', color: 'red' },
  warn: { symbol: '!', color: 'yellow' },
  debug: { symbol: 'd', color: 'gray' },
  hint: { symbol: '?', color: 'blue' },
  start: { symbol: '>', color: 'magenta' },
  announcement: { symbol: '*', color: 'magenta' }
};

export const Message: React.FC<MessageProps> = ({ message }) => {
  const { symbol, color } = MESSAGE_ICONS[message.type];

  return (
    <box flexDirection="row">
      <text fg={color}>{symbol}</text>
      <text> {stripAnsi(message.message)}</text>
    </box>
  );
};
