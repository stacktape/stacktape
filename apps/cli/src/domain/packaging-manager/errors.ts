import type { PackagingErrorDetails } from '@stacktape/packaging/runtime-contracts';
import { CliError } from '@utils/errors';

export const createCliPackagingError = ({ type = 'PACKAGING', message, hint, stack }: PackagingErrorDetails) => {
  const error = new CliError({
    category: type,
    code: `${type}_FAILED`,
    message,
    hints: hint
  });
  if (stack) error.stack = stack;
  return error;
};
