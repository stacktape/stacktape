/** @jsxImportSource @opentui/react */
import React from 'react';
import { stripAnsi } from '../utils';

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
    <box flexDirection="column" marginBottom={1}>
      {/* Error header with number */}
      <box flexDirection="row">
        <text fg="red">
          <strong>{index + 1}.</strong>
        </text>
        {parsed.resource && (
          <>
            <text> </text>
            <text fg="white">
              <strong>{parsed.resource}</strong>
            </text>
            {parsed.context && <text fg="gray"> (in {parsed.context})</text>}
          </>
        )}
      </box>

      {/* Error message */}
      <box marginLeft={3}>
        <text fg="white">{stripAnsi(parsed.error)}</text>
      </box>

      {/* Hints */}
      {error.hints && error.hints.length > 0 && (
        <box flexDirection="column" marginLeft={3} marginTop={0}>
          {error.hints.map((hint, hintIndex) => (
            <box key={hintIndex} flexDirection="row">
              <text fg="blue">hint: </text>
              <text fg="gray">{stripAnsi(hint)}</text>
            </box>
          ))}
        </box>
      )}
    </box>
  );
};

export const StackErrors: React.FC<StackErrorsProps> = ({ errors, title }) => {
  if (errors.length === 0) return null;

  return (
    <box flexDirection="column" marginTop={1}>
      {/* Title section */}
      {title && (
        <box marginBottom={1}>
          <text fg="red">
            <strong>{title}</strong>
          </text>
        </box>
      )}

      {/* Errors list */}
      <box flexDirection="column" marginLeft={1}>
        {errors.map((error, index) => (
          <ErrorItem key={index} error={error} index={index} />
        ))}
      </box>
    </box>
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
