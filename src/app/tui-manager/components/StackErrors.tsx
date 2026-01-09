import { Box, Text } from 'ink';
import React from 'react';

export type StackError = {
  errorMessage: string;
  hints?: string[];
};

type StackErrorsProps = {
  errors: StackError[];
  title?: string;
};

/**
 * Clean up AWS error messages by removing internal metadata like RequestToken and HandlerErrorCode.
 */
const cleanErrorMessage = (message: string): string => {
  let cleaned = message;
  // Remove (RequestToken: ..., HandlerErrorCode: ...) pattern first
  cleaned = cleaned.replace(/\s*\(RequestToken:[^,]+,\s*HandlerErrorCode:[^)]+\)/gi, '');
  // Remove standalone (RequestToken: ...) pattern
  cleaned = cleaned.replace(/\s*\(RequestToken:[^)]+\)/gi, '');
  // Remove standalone (HandlerErrorCode: ...) pattern
  cleaned = cleaned.replace(/\s*\(HandlerErrorCode:[^)]+\)/gi, '');
  // Remove "Resource handler returned message: " prefix and extract the quoted message
  const handlerMatch = cleaned.match(/^Resource handler returned message:\s*"([\s\S]+)"\.?\s*$/);
  if (handlerMatch) {
    cleaned = handlerMatch[1];
  }
  // Remove AWS SDK details like (Service: Lambda, Status Code: 404, Request ID: ..., SDK Attempt Count: 1)
  cleaned = cleaned.replace(/\s*\(Service:[^,]+,\s*Status Code:\s*\d+,\s*Request ID:[^,]+,\s*SDK Attempt Count:\s*\d+\)/gi, '');
  // Remove separate (Service: ...) pattern
  cleaned = cleaned.replace(/\s*\(Service:[^)]+\)/gi, '');
  // Remove separate (SDK Attempt Count: ...) pattern
  cleaned = cleaned.replace(/\s*\(SDK Attempt Count:\s*\d+\)/gi, '');
  // Clean up any double spaces that might result
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned;
};

/**
 * Parse error message to extract resource name and the actual error.
 * AWS errors often come in format: "Resource X: Error message"
 */
const parseErrorMessage = (message: string): { resource?: string; context?: string; error: string } => {
  const cleaned = cleanErrorMessage(message);

  // Try to match "Resource X (part of Y): Error" pattern
  const partOfMatch = cleaned.match(/^Resource\s+(\S+)\s+\(part of\s+([^)]+)\):\s*([\s\S]+)$/);
  if (partOfMatch) {
    return {
      resource: partOfMatch[1],
      context: partOfMatch[2],
      error: partOfMatch[3]
    };
  }

  // Try to match "Resource X: Error" pattern
  const resourceMatch = cleaned.match(/^Resource\s+(\S+):\s*([\s\S]+)$/);
  if (resourceMatch) {
    return {
      resource: resourceMatch[1],
      error: resourceMatch[2]
    };
  }

  return { error: cleaned };
};

const ErrorItem: React.FC<{ error: StackError; index: number }> = ({ error, index }) => {
  const parsed = parseErrorMessage(error.errorMessage);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Error header with number */}
      <Box>
        <Text color="red" bold>
          {index + 1}.
        </Text>
        {parsed.resource && (
          <>
            <Text> </Text>
            <Text color="white" bold>
              {parsed.resource}
            </Text>
            {parsed.context && <Text color="gray"> (in {parsed.context})</Text>}
          </>
        )}
      </Box>

      {/* Error message */}
      <Box marginLeft={3}>
        <Text color="white">{parsed.error}</Text>
      </Box>

      {/* Hints */}
      {error.hints && error.hints.length > 0 && (
        <Box flexDirection="column" marginLeft={3} marginTop={0}>
          {error.hints.map((hint, hintIndex) => (
            <Box key={hintIndex}>
              <Text color="blue">hint: </Text>
              <Text color="gray">{hint}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export const StackErrors: React.FC<StackErrorsProps> = ({ errors, title }) => {
  if (errors.length === 0) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Title section */}
      {title && (
        <Box marginBottom={1}>
          <Text color="red" bold>
            {title}
          </Text>
        </Box>
      )}

      {/* Errors list */}
      <Box flexDirection="column" marginLeft={1}>
        {errors.map((error, index) => (
          <ErrorItem key={index} error={error} index={index} />
        ))}
      </Box>
    </Box>
  );
};

/**
 * Render stack errors to a plain string (for non-TTY mode).
 */
export const renderStackErrorsToString = (
  errors: StackError[],
  colorize: (color: string, text: string) => string
): string => {
  if (errors.length === 0) return '';

  const lines: string[] = [];

  errors.forEach((error, index) => {
    const parsed = parseErrorMessage(error.errorMessage);

    // Error header
    let header = colorize('red', `${index + 1}.`);
    if (parsed.resource) {
      header += ` ${parsed.resource}`;
      if (parsed.context) {
        header += ` (in ${parsed.context})`;
      }
    }
    lines.push(header);

    // Error message (indented)
    lines.push(`   ${parsed.error}`);

    // Hints
    if (error.hints && error.hints.length > 0) {
      error.hints.forEach((hint) => {
        lines.push(`   ${colorize('blue', 'hint:')} ${hint}`);
      });
    }

    // Add spacing between errors
    if (index < errors.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n');
};
