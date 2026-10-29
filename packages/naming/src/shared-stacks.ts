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

/**
 * The dev session that holds each stage of a dev network: one parameter per dev stack, which the session refreshes
 * while it runs, so a start elsewhere can refuse the stage with one read.
 */
export const getDevNetworkHolderParameterPrefix = (networkStackName: string) =>
  `/stacktape/dev-network/${networkStackName}/holders`;

/**
 * The relay of a dev network's box, which the network's stack keeps in this parameter. The box installs it whenever its
 * relay service starts, so a new relay reaches a running box with a restart of the service, without stopping the box.
 */
export const getDevNetworkRelayParameterName = (networkStackName: string) =>
  `/stacktape/dev-network/${networkStackName}/relay`;

/**
 * The relay ports of a dev network that leases hold: one parameter per port, holding the name of the lease parameter
 * that reserved it. Creating it is atomic, so two leases never hold one port.
 */
export const getDevNetworkPortParameterPrefix = (networkStackName: string) =>
  `/stacktape/dev-network/${networkStackName}/ports`;
