import { Box, Text } from 'ink';
import React from 'react';
import stringWidth from 'string-width';

export type ErrorDisplayData = {
  errorType: string;
  message: string;
  hints?: string[];
  stackTrace?: string;
  sentryEventId?: string;
  isExpected?: boolean;
};

type ErrorDisplayProps = {
  error: ErrorDisplayData;
};

const BORDER_CHAR = '─';
const CORNER_TL = '┌';
const CORNER_TR = '┐';
const CORNER_BL = '└';
const CORNER_BR = '┘';
const VERTICAL = '│';

const ErrorHeader: React.FC<{ errorType: string; isExpected?: boolean }> = ({ errorType, isExpected }) => {
  const headerWidth = 60;
  const typeLabel = isExpected === false ? 'UNEXPECTED ERROR' : errorType;
  const padding = Math.max(0, headerWidth - typeLabel.length - 4);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;

  return (
    <Box flexDirection="column">
      <Text color="red">
        {CORNER_TL}
        {BORDER_CHAR.repeat(headerWidth)}
        {CORNER_TR}
      </Text>
      <Box>
        <Text color="red">{VERTICAL}</Text>
        <Text color="red" bold>
          {' '.repeat(leftPad)}✖ {typeLabel}
          {' '.repeat(rightPad)}
        </Text>
        <Text color="red">{VERTICAL}</Text>
      </Box>
      <Text color="red">
        {CORNER_BL}
        {BORDER_CHAR.repeat(headerWidth)}
        {CORNER_BR}
      </Text>
    </Box>
  );
};

const HintSection: React.FC<{ hints: string[] }> = ({ hints }) => {
  if (hints.length === 0) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="blue" bold>
        💡 Hints:
      </Text>
      {hints.map((hint, index) => (
        <Box key={index} marginLeft={2}>
          <Text color="gray">• </Text>
          <Text color="white">{hint}</Text>
        </Box>
      ))}
    </Box>
  );
};

const StackTraceSection: React.FC<{ stackTrace: string }> = ({ stackTrace }) => {
  if (!stackTrace) return null;

  const lines = stackTrace.split('\n').filter(Boolean);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray" bold>
        Stack trace:
      </Text>
      <Box flexDirection="column" marginLeft={2}>
        {lines.map((line, index) => (
          <Text key={index} color="gray" dimColor>
            {line}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

const SentrySection: React.FC<{ sentryEventId: string }> = ({ sentryEventId }) => {
  if (!sentryEventId) return null;

  return (
    <Box marginTop={1}>
      <Text color="gray">Event ID: </Text>
      <Text color="cyan">{sentryEventId}</Text>
    </Box>
  );
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  const hints = error.hints || [];

  return (
    <Box flexDirection="column" marginY={1}>
      <ErrorHeader errorType={error.errorType} isExpected={error.isExpected} />

      {/* Error message */}
      <Box marginTop={1} marginLeft={2} flexDirection="column">
        <Text color="white" bold>
          {error.message}
        </Text>
      </Box>

      {/* Hints section */}
      {hints.length > 0 && (
        <Box marginLeft={2}>
          <HintSection hints={hints} />
        </Box>
      )}

      {/* Stack trace (for debugging) */}
      {error.stackTrace && (
        <Box marginLeft={2}>
          <StackTraceSection stackTrace={error.stackTrace} />
        </Box>
      )}

      {/* Sentry event ID */}
      {error.sentryEventId && (
        <Box marginLeft={2}>
          <SentrySection sentryEventId={error.sentryEventId} />
        </Box>
      )}
    </Box>
  );
};

const DIVIDER_LEFT = '├';
const DIVIDER_RIGHT = '┤';

/**
 * Wrap text to fit within a given width, breaking on word boundaries.
 * Handles newlines in the original text properly.
 */
const wrapText = (text: string, maxWidth: number): string[] => {
  const result: string[] = [];

  // First split by newlines to preserve intentional line breaks
  const paragraphs = text.split(/\r?\n/);

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      // Preserve empty lines as empty strings
      result.push('');
      continue;
    }

    const words = paragraph.split(' ').filter((w) => w !== '');
    let currentLine = '';

    for (const word of words) {
      // Handle words longer than maxWidth by truncating
      const safeWord = word.length > maxWidth ? `${word.slice(0, maxWidth - 3)}...` : word;

      if (currentLine.length + safeWord.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + safeWord;
      } else {
        if (currentLine) result.push(currentLine);
        currentLine = safeWord;
      }
    }
    if (currentLine) result.push(currentLine);
  }

  return result;
};

/**
 * Render error to a plain string (for non-TTY mode).
 */
export const renderErrorToString = (
  error: ErrorDisplayData,
  colorize: (color: string, text: string) => string,
  makeBold: (text: string) => string
): string => {
  const lines: string[] = [];
  const boxWidth = 70;
  const contentWidth = boxWidth - 4; // Account for "│ " and " │"
  const typeLabel = error.isExpected === false ? 'UNEXPECTED ERROR' : error.errorType;

  // Helper to create a padded line inside the box
  const boxLine = (content: string, padChar = ' ') => {
    const visibleLength = stringWidth(content); // Properly handles ANSI codes and unicode
    const padding = Math.max(0, contentWidth - visibleLength);
    return `${colorize('red', VERTICAL)} ${content}${padChar.repeat(padding)} ${colorize('red', VERTICAL)}`;
  };

  // Top border
  lines.push(colorize('red', `${CORNER_TL}${BORDER_CHAR.repeat(boxWidth)}${CORNER_TR}`));

  // Error type header (centered)
  const headerText = `✖ ${typeLabel}`;
  const headerTextWidth = stringWidth(headerText);
  const headerPadding = Math.max(0, contentWidth - headerTextWidth);
  const headerLeftPad = Math.floor(headerPadding / 2);
  const headerRightPad = headerPadding - headerLeftPad;
  lines.push(
    colorize('red', VERTICAL) +
      ' '.repeat(headerLeftPad + 1) +
      colorize('red', makeBold(headerText)) +
      ' '.repeat(headerRightPad + 1) +
      colorize('red', VERTICAL)
  );

  // Divider
  lines.push(colorize('red', `${DIVIDER_LEFT}${BORDER_CHAR.repeat(boxWidth)}${DIVIDER_RIGHT}`));

  // Error message (wrapped)
  const messageLines = wrapText(error.message, contentWidth);
  for (const msgLine of messageLines) {
    lines.push(boxLine(colorize('white', makeBold(msgLine))));
  }

  // Bottom border
  lines.push(colorize('red', `${CORNER_BL}${BORDER_CHAR.repeat(boxWidth)}${CORNER_BR}`));

  // Hints (outside the box)
  const hints = error.hints || [];
  if (hints.length > 0) {
    lines.push('');
    lines.push(colorize('blue', makeBold('💡 Hints:')));
    hints.forEach((hint) => {
      lines.push(`  ${colorize('gray', '•')} ${hint}`);
    });
  }

  // Stack trace
  if (error.stackTrace) {
    lines.push('');
    lines.push(colorize('gray', makeBold('Stack trace:')));
    error.stackTrace.split('\n').forEach((line) => {
      if (line.trim()) {
        lines.push(`  ${colorize('gray', line)}`);
      }
    });
  }

  // Sentry event ID
  if (error.sentryEventId) {
    lines.push('');
    lines.push(`${colorize('gray', 'Event ID:')} ${colorize('cyan', error.sentryEventId)}`);
  }

  lines.push('');

  return lines.join('\n');
};
