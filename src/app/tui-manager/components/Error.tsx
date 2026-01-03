/** @jsxImportSource @opentui/react */
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

const HintSection: React.FC<{ hints: string[] }> = ({ hints }) => {
  if (hints.length === 0) return null;

  return (
    <box flexDirection="column" marginTop={1}>
      <text fg="blue">
        <strong>Hints:</strong>
      </text>
      {hints.map((hint, index) => (
        <box key={index} marginLeft={2}>
          <text fg="gray">- </text>
          <text>{hint}</text>
        </box>
      ))}
    </box>
  );
};

const StackTraceSection: React.FC<{ stackTrace: string }> = ({ stackTrace }) => {
  if (!stackTrace) return null;

  const lines = stackTrace.split('\n').filter(Boolean);

  return (
    <box flexDirection="column" marginTop={1}>
      <text fg="gray">
        <strong>Stack trace:</strong>
      </text>
      <box flexDirection="column" marginLeft={2}>
        {lines.map((line, index) => (
          <text key={index} fg="gray">
            {line}
          </text>
        ))}
      </box>
    </box>
  );
};

const SentrySection: React.FC<{ sentryEventId: string }> = ({ sentryEventId }) => {
  if (!sentryEventId) return null;

  return (
    <box marginTop={1} flexDirection="row">
      <text fg="gray">Event ID: </text>
      <text fg="cyan">{sentryEventId}</text>
    </box>
  );
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  const hints = error.hints || [];
  const typeLabel = error.isExpected === false ? 'UNEXPECTED ERROR' : error.errorType;

  return (
    <box flexDirection="column" marginTop={1} marginBottom={1}>
      <box border borderStyle="single" borderColor="red" paddingLeft={1} paddingRight={1} flexDirection="row">
        <text fg="red">
          <strong>{typeLabel}: </strong>
        </text>
        <text>{error.message}</text>
      </box>

      {/* Hints section */}
      {hints.length > 0 && <HintSection hints={hints} />}

      {/* Stack trace (for debugging) */}
      {error.stackTrace && <StackTraceSection stackTrace={error.stackTrace} />}

      {/* Sentry event ID */}
      {error.sentryEventId && <SentrySection sentryEventId={error.sentryEventId} />}
    </box>
  );
};

// Box drawing characters for non-TTY mode
const BORDER_CHAR = '-';
const CORNER_TL = '+';
const CORNER_TR = '+';
const CORNER_BL = '+';
const CORNER_BR = '+';
const VERTICAL = '|';
const DIVIDER_LEFT = '+';
const DIVIDER_RIGHT = '+';

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
      // Handle words longer than maxWidth by breaking them across lines
      if (word.length > maxWidth) {
        // Push current line if not empty
        if (currentLine) {
          result.push(currentLine);
          currentLine = '';
        }
        // Break long word into chunks
        let remaining = word;
        while (remaining.length > maxWidth) {
          result.push(remaining.slice(0, maxWidth));
          remaining = remaining.slice(maxWidth);
        }
        if (remaining) {
          currentLine = remaining;
        }
        continue;
      }

      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) result.push(currentLine);
        currentLine = word;
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
  // Content width = boxWidth - 2 (for "| " prefix and " |" suffix = 4 chars, but border adds 2 corners)
  // Total line: | + space + content + padding + space + | = 4 + contentWidth
  // Border line: corner + boxWidth + corner = boxWidth + 2
  // So: 4 + contentWidth = boxWidth + 2, therefore contentWidth = boxWidth - 2
  const contentWidth = boxWidth - 2;
  const typeLabel = error.isExpected === false ? 'UNEXPECTED ERROR' : error.errorType;

  // Helper to create a padded line inside the box
  const boxLine = (content: string) => {
    const visibleLength = stringWidth(content); // Properly handles ANSI codes and unicode
    const padding = Math.max(0, contentWidth - visibleLength);
    return `${colorize('red', VERTICAL)} ${content}${' '.repeat(padding)} ${colorize('red', VERTICAL)}`;
  };

  // Top border
  lines.push(colorize('red', `${CORNER_TL}${BORDER_CHAR.repeat(boxWidth)}${CORNER_TR}`));

  // Error type header (centered)
  const headerText = `? ${typeLabel}`;
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
    lines.push(boxLine(makeBold(msgLine)));
  }

  // Bottom border
  lines.push(colorize('red', `${CORNER_BL}${BORDER_CHAR.repeat(boxWidth)}${CORNER_BR}`));

  // Hints (outside the box)
  const hints = error.hints || [];
  if (hints.length > 0) {
    lines.push('');
    lines.push(colorize('blue', makeBold('Hints:')));
    hints.forEach((hint) => {
      lines.push(`  ${colorize('gray', '-')} ${hint}`);
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
