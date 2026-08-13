import { createHash } from 'node:crypto';

export type SharedStackKind = 'email-identity';

const sharedResourceHash = (kind: SharedStackKind, canonicalIdentity: string) =>
  createHash('sha256').update(`${kind}\0${canonicalIdentity}`, 'utf8').digest('hex').slice(0, 20);

/**
 * Account and region are deliberately absent: CloudFormation stack names are already scoped by both.
 * The canonical resource identity makes independently deployed projects converge on the same stack.
 */
export const getSharedResourceStackName = (kind: SharedStackKind, canonicalIdentity: string) =>
  `stacktape-shared-${kind}-${sharedResourceHash(kind, canonicalIdentity)}`;

export const getSharedEmailConfigurationSetName = (canonicalIdentity: string) =>
  `stacktape-email-${sharedResourceHash('email-identity', canonicalIdentity)}`;

export const getSharedEmailFeedbackTopicName = (canonicalIdentity: string) =>
  `stacktape-email-feedback-${sharedResourceHash('email-identity', canonicalIdentity)}`;
