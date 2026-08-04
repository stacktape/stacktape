import { CliError } from '@utils/errors';

export const deployedResourceNotFoundError = ({
  resourceName,
  stackName
}: {
  resourceName: string;
  stackName: string;
}) =>
  new CliError({
    category: 'NON_EXISTING_RESOURCE',
    code: 'DEPLOYED_RESOURCE_NOT_FOUND',
    message: `Resource \`${resourceName}\` is not deployed as part of stack \`${stackName}\`.`
  });
