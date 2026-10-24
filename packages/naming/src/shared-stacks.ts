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

/**
 * The dev network of one AWS account and region: the VPC, the dev box and the security groups every `stacktape dev`
 * session in that account and region shares. A name suffix exists only for guarded live tests, which own an isolated
 * network next to a real one.
 */
export const getDevNetworkStackName = (suffix?: string) =>
  suffix ? `stacktape-dev-network-${suffix}` : 'stacktape-dev-network';

/** Port leases of a dev network: one parameter per (stack, resource), holding the relay port. */
export const getDevNetworkLeaseParameterPrefix = (networkStackName: string) =>
  `/stacktape/dev-network/${networkStackName}/leases`;
