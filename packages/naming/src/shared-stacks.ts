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

/**
 * The shared network of one AWS account and region: the VPC, subnets, route tables and gateway endpoints every
 * non-production stage placed in it uses. It is a sibling of the dev network, not the same VPC.
 */
export const getSharedNetworkStackName = () => 'stacktape-network';

/** The NAT of the shared network: a separate stack, created by the first stage that needs outbound internet. */
export const getSharedNatStackName = () => 'stacktape-network-nat';

/** The network stack's janitor, which removes the NAT and then the network once no stage used them for a while. */
export const getSharedNetworkJanitorFunctionName = () => `${getSharedNetworkStackName()}-janitor`;

/** Parameters of the shared network that live outside its stacks, so a deploy can write them before the stacks exist. */
export const getSharedNetworkParameterPrefix = () => '/stacktape/shared-network';

/**
 * When a shared stack was last used: written by each deploy before it makes sure of the stack, and by the janitor
 * while a stage imports it. The janitor removes the stack once this is older than its grace period.
 */
export const getSharedNetworkLastUsedParameterName = (stackName: string) =>
  `${getSharedNetworkParameterPrefix()}/${stackName}/last-used`;

/**
 * Exports of the shared network and its NAT. A stage in the shared network imports `vpc-id` in its stage security
 * group, and a stage that uses the NAT imports `nat` in a tag of that group: CloudFormation then refuses to delete
 * either stack while a stage uses it, and `ListImports` on these names lists the stages that do.
 */
export const getSharedNetworkExportName = (
  output: 'vpc-id' | 'public-subnet-ids' | 'private-subnet-ids' | 'private-route-table-ids' | 'nat'
) => (output === 'nat' ? `${getSharedNatStackName()}-id` : `${getSharedNetworkStackName()}-${output}`);
