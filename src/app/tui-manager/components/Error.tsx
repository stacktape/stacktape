import { Alert } from '@inkjs/ui';
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

// Map error codes to human-readable labels
const ERROR_TYPE_LABELS: Record<string, string> = {
  API_KEY: 'API Key Error',
  API_SERVER: 'API Server Error',
  AWS_ACCOUNT: 'AWS Account Error',
  BUDGET: 'Budget Error',
  CLI: 'CLI Error',
  CODEBUILD: 'CodeBuild Error',
  CONFIG: 'Configuration Error',
  CONFIG_GENERATION: 'Config Generation Error',
  CONFIG_VALIDATION: 'Config Validation Error',
  CONFIRMATION_REQUIRED: 'Confirmation Required',
  CREDENTIALS: 'Credentials Error',
  DIRECTIVE: 'Directive Error',
  DOCKER: 'Docker Error',
  DOMAIN_MANAGEMENT: 'Domain Management Error',
  EXISTING_STACK: 'Existing Stack Error',
  INPUT: 'Input Error',
  MISSING_OUTPUT: 'Missing Output Error',
  MISSING_PREREQUISITE: 'Missing Prerequisite',
  NON_EXISTING_RESOURCE: 'Resource Not Found',
  NON_EXISTING_STACK: 'Stack Not Found',
  NOT_YET_IMPLEMENTED: 'Not Yet Implemented',
  PACKAGING_CONFIG: 'Packaging Config Error',
  PARAMETER: 'Parameter Error',
  SCRIPT: 'Script Error',
  SOURCE_CODE: 'Source Code Error',
  STACK: 'Stack Error',
  STACK_MONITORING: 'Stack Monitoring Error',
  SUBSCRIPTION_REQUIRED: 'Subscription Required',
  SYNC_BUCKET: 'Bucket Sync Error',
  UNSUPPORTED_RESOURCE: 'Unsupported Resource'
};

const getErrorLabel = (errorType: string): string => {
  return ERROR_TYPE_LABELS[errorType] || errorType.replace(/_/g, ' ') + ' Error';
};

const HintSection: React.FC<{ hints: string[] }> = ({ hints }) => {
  if (hints.length === 0) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="blue" bold>
        Hints:
      </Text>
      {hints.map((hint, index) => (
        <Box key={index} marginLeft={2}>
          <Text color="gray">• </Text>
          <Text>{hint}</Text>
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
  const typeLabel = error.isExpected === false ? 'Unexpected Error' : getErrorLabel(error.errorType);

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Only show error type header in Alert box */}
      <Alert variant="error">{typeLabel}</Alert>

      {/* Error message outside the box */}
      <Box marginTop={1}>
        <Text>{error.message}</Text>
      </Box>

      {/* Hints section */}
      {hints.length > 0 && <HintSection hints={hints} />}

      {/* Stack trace (for debugging) */}
      {error.stackTrace && <StackTraceSection stackTrace={error.stackTrace} />}

      {/* Sentry event ID */}
      {error.sentryEventId && <SentrySection sentryEventId={error.sentryEventId} />}
    </Box>
  );
};

// Box drawing characters for non-TTY mode
const BORDER_CHAR = '─';
const CORNER_TL = '┌';
const CORNER_TR = '┐';
const CORNER_BL = '└';
const CORNER_BR = '┘';
const VERTICAL = '│';

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
  const boxWidth = 44;
  const contentWidth = boxWidth - 2;
  const typeLabel = error.isExpected === false ? 'Unexpected Error' : getErrorLabel(error.errorType);

  // Top border
  lines.push(colorize('red', `${CORNER_TL}${BORDER_CHAR.repeat(boxWidth)}${CORNER_TR}`));

  // Error type header (centered) - only header in box
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

  // Bottom border
  lines.push(colorize('red', `${CORNER_BL}${BORDER_CHAR.repeat(boxWidth)}${CORNER_BR}`));

  // Error message (outside the box)
  lines.push('');
  const messageLines = wrapText(error.message, 100);
  for (const msgLine of messageLines) {
    lines.push(msgLine);
  }

  // Hints (outside the box)
  const hints = error.hints || [];
  if (hints.length > 0) {
    lines.push('');
    lines.push(colorize('blue', makeBold('Hints:')));
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
