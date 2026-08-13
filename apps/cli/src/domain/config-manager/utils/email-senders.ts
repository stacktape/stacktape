import type { StpEmailSender } from '../resolved-types/email-senders';
import { CliError } from '@utils/errors';

const invalid = (resource: StpEmailSender, message: string, hints?: string) =>
  new CliError({
    category: 'CONFIG_VALIDATION',
    code: 'CONFIG_EMAIL_SENDER_INVALID',
    message: `Email sender \`${resource.name}\` ${message}`,
    hints
  });

export const validateEmailSenderConfig = ({ resource }: { resource: StpEmailSender }) => {
  if (resource.manageIdentity !== false && resource.configurationSetName) {
    throw invalid(resource, 'cannot set `configurationSetName` while `manageIdentity` is enabled.');
  }
};

export const validateEmailSenderIdentityUniqueness = (resources: StpEmailSender[]) => {
  const namesByIdentity = new Map<string, string[]>();
  for (const resource of resources) {
    namesByIdentity.set(resource.identity, [...(namesByIdentity.get(resource.identity) ?? []), resource.name]);
  }
  const duplicate = [...namesByIdentity].find(([, names]) => names.length > 1);
  if (duplicate) {
    const [identity, names] = duplicate;
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_EMAIL_SENDER_IDENTITY_DUPLICATE',
      message: `Email identity \`${identity}\` is declared by multiple resources: ${names.map((name) => `\`${name}\``).join(', ')}.`,
      hints: 'Declare one email-sender resource and connect every workload to that resource.'
    });
  }
};
