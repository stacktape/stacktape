import type { PackagingErrorDetails } from '@stacktape/packaging/runtime-contracts';
import { CliError } from '@utils/errors';

export const createCliPackagingError = ({ type = 'PACKAGING', message, hint, stack, cause }: PackagingErrorDetails) => {
  const error = new CliError({
    category: type,
    code: `${type}_FAILED`,
    message,
    hints: hint,
    cause
  });
  if (stack) error.stack = stack;
  return error;
};
