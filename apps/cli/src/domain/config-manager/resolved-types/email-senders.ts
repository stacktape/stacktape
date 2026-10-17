import type { EmailSender } from '@stacktape/config/email-senders';

export type StpEmailSender = EmailSender['properties'] & {
  name: string;
  type: EmailSender['type'];
  configParentResourceType: EmailSender['type'];
  nameChain: string[];
};
