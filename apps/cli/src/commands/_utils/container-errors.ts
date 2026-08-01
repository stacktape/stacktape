import { CliError } from '@utils/errors';

export const containerErrors = {
  invalidResource(resourceName: string) {
    return new CliError({
      category: 'NON_EXISTING_RESOURCE',
      code: 'CONTAINER_RESOURCE_INVALID',
      message: `Resource \`${resourceName}\` is not a deployed container workload.`
    });
  },
  selectionRequired({ resourceName, availableContainers }: { resourceName: string; availableContainers: string[] }) {
    return new CliError({
      category: 'NON_EXISTING_RESOURCE',
      code: 'CONTAINER_SELECTION_REQUIRED',
      message: `Resource \`${resourceName}\` contains multiple containers or does not contain the requested container.`,
      hints: `Specify \`--container\` with one of: ${availableContainers.map((name) => `\`${name}\``).join(', ')}.`
    });
  }
};
