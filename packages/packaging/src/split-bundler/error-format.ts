const messageFrom = (value: unknown): string => {
  if (typeof value === 'object' && value !== null && 'message' in value && value.message) {
    return String(value.message);
  }
  return String(value);
};

/**
 * Bun build diagnostics are structural objects rather than guaranteed `Error` instances.
 * Preserve their message fields when turning a failed build into Stacktape's packaging error.
 */
export const formatBuildError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'errors' in error && Array.isArray(error.errors)) {
    return error.errors.map(messageFrom).join('\n');
  }
  return messageFrom(error);
};
