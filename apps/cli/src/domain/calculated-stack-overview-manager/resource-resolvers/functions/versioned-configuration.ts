import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { createHash } from 'node:crypto';
import { isIntrinsic } from '@stacktape/cloudformation/intrinsics';

/**
 * Function properties a published version does not snapshot, or that the publisher follows another way: `Code` changes
 * `codeDigest`, and the name, tags and reserved concurrency belong to the function rather than to a version.
 */
const UNVERSIONED_PROPERTIES = new Set(['Code', 'FunctionName', 'Tags', 'ReservedConcurrentExecutions']);

/** A dynamic reference, such as the version-pinned `{{resolve:secretsmanager:…}}` that `$Secret()` produces. */
const DYNAMIC_REFERENCE = /\{\{resolve:[^}]*\}\}/g;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const withoutDynamicReferences = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.replace(DYNAMIC_REFERENCE, (reference) => `resolve-${sha256(reference)}`);
  }
  if (Array.isArray(value)) return value.map(withoutDynamicReferences);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, withoutDynamicReferences(child)]));
  }
  return value;
};

/**
 * What a published version snapshots of a function: its version publisher's `versionedConfiguration` property.
 *
 * Literal values enter only a digest, so no plaintext environment value is copied into the custom resource.
 * Intrinsics are carried as themselves, so CloudFormation re-evaluates them when what they reference changes, such as
 * a replaced layer version. Inside them, each dynamic reference is replaced by its digest: CloudFormation does not
 * resolve secure ones in a custom resource. Keys are visited in sorted order and nothing depends on time, so an
 * unchanged function keeps its identity.
 */
const getVersionedConfiguration = (functionProperties: Record<string, unknown>) => {
  const references: unknown[] = [];
  const skeleton = (value: unknown): unknown => {
    if (isIntrinsic(value)) {
      references.push(withoutDynamicReferences(value));
      return { reference: references.length - 1 };
    }
    if (Array.isArray(value)) return value.map(skeleton);
    if (value && typeof value === 'object') {
      const object = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(object)
          .toSorted()
          .map((key) => [key, skeleton(object[key])])
      );
    }
    return value;
  };
  const versioned = Object.fromEntries(
    Object.entries(functionProperties).filter(([key]) => !UNVERSIONED_PROPERTIES.has(key))
  );
  return { digest: sha256(JSON.stringify(skeleton(versioned))), references };
};

/**
 * Gives every Lambda version publisher the identity of its function's final configuration.
 *
 * A function behind an alias (`deployment` or `provisionedConcurrency`) is invoked through the version its publisher
 * publishes, and CloudFormation runs the publisher only when the publisher's own properties change. `codeDigest`
 * covers code; this covers everything else a version snapshots, so a configuration-only change publishes a version and
 * moves the alias instead of leaving it on the old configuration. It runs last in finalization because `connectTo`
 * variables, resource overrides and transforms all change a function after its resolver ran.
 */
export const stampLambdaVersionPublishers = (template: CloudFormationTemplate) => {
  for (const resource of Object.values(template.Resources)) {
    if (resource.Type !== 'AWS::CloudFormation::CustomResource' || !resource.Properties) continue;
    const properties = resource.Properties as Record<string, unknown>;
    const publishLambdaVersion = properties.publishLambdaVersion as { functionName?: { Ref?: unknown } } | undefined;
    const functionLogicalName = publishLambdaVersion?.functionName?.Ref;
    if (typeof functionLogicalName !== 'string') continue;
    const lambda = template.Resources[functionLogicalName];
    if (lambda?.Type !== 'AWS::Lambda::Function' || !lambda.Properties) continue;
    properties.versionedConfiguration = getVersionedConfiguration(lambda.Properties as Record<string, unknown>);
  }
};
