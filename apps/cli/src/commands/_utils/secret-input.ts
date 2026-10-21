import { CliError } from '@utils/errors';

export const requireSecretName = (secretName: string | undefined) => {
  if (!secretName) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SECRET_NAME_REQUIRED',
      message: 'Missing required flag `--secret-name`.',
      hints: 'Provide `--secret-name <name>`.'
    });
  }
  return secretName;
};

export const requireSecretValueInput = ({
  secretFile,
  secretValue
}: {
  secretFile: string | undefined;
  secretValue: string | undefined;
}) => {
  if (secretValue === undefined && !secretFile) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SECRET_VALUE_REQUIRED',
      message: 'Missing required flag `--value` or `--file`.',
      hints: 'Provide `--value <value>` or `--file <path>`.'
    });
  }
};
