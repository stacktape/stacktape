/**
 * Names that may appear in a resource's `connectTo` list without naming another resource in the same
 * configuration. They stand for an AWS service the workload should be granted access to.
 *
 * The list is authored configuration vocabulary, so it is owned here rather than by the CLI resolver that
 * consumes it: the resolver used to declare the constant and the ambient config model read it back through a
 * `typeof import('../../src/domain/...')`, which is a package-to-application dependency in the wrong direction.
 */
export const CONNECT_TO_AWS_SERVICE_MACROS = ['aws:ses'] as const;

export type ConnectToAwsServicesMacro = (typeof CONNECT_TO_AWS_SERVICE_MACROS)[number];
