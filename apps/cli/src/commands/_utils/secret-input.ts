import { CliError } from '@utils/errors';

export const requireSecretName = (secretName: string | undefined) => {
  if (!secretName) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SECRET_NAME_REQUIRED',
      message: 'Missing required flag `--secretName`.',
      hints: 'Provide `--secretName <name>`.'
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
  if (!secretValue && !secretFile) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_SECRET_VALUE_REQUIRED',
      message: 'Missing required flag `--secretValue` or `--secretFile`.',
      hints: 'Provide `--secretValue <value>` or `--secretFile <path>`.'
    });
  }
};
