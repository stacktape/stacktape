/**
 * Which functions a dev stack update leaves on the code they run, instead of building them.
 *
 * A dev session that leaves functions out (`--resources`, `--skip-resources`) does not run them, so the dev stack does
 * not build them either: a function the developer deliberately left out may not even build. The dev stack keeps such a
 * function's code only while two things hold:
 *
 * - Every identity the update writes describes the bytes the function runs. The template names the stored object of
 *   exactly that code, and the digest tags and the release record name the same artifact. A session that deployed
 *   other code directly uploaded it first, so the template switches to that object: CloudFormation then deploys the
 *   bytes the function already runs, and a rollback to this release restores them. Without such an object, or while an
 *   earlier update of its code had not finished, the function is built.
 * - Nothing the code depends on changes (`findKeptFunctionsWithChangedConfiguration`). Old code with a new environment,
 *   handler or role is a combination nobody tested, so such a function is built like a selected one.
 *
 * It is also built when the dev stack has no code for it (a new stack or function) or when it runs on the shared layers
 * older dev stacks built: dev stacks no longer build them, so the layers leave the template.
 */
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { tagNames } from '@stacktape/naming/tag-names';
import { SHARED_LAYER_NUMBERS, getDeployedArtifactDigest, getTagValue, parseSharedLayersTag } from './shared-layers';
import { parseBucketObjectS3Key } from './utils';

export type KeptFunctionCode = {
  /** The stored object of the code the function runs. */
  s3Key: string;
  /** The digest of that object, which the identity tags record too. */
  digest: string;
  identityTags: { name: string; value: string }[];
};

export type SkippedFunctionBuildReason =
  | 'not-deployed'
  | 'stored-code-missing'
  | 'code-unknown'
  | 'uses-shared-layers'
  | 'configuration-changed';

export type SkippedFunctionCode =
  | { name: string; keep: KeptFunctionCode }
  | { name: string; build: SkippedFunctionBuildReason };

type TemplateResource = { Type?: string; Properties?: Record<string, unknown>; DependsOn?: unknown };
type Template = { Resources?: Record<string, unknown> };

const SHARED_LAYER_LOGICAL_NAMES = new Set(
  SHARED_LAYER_NUMBERS.map((number) => cfLogicalNames.sharedChunkLayer(number))
);

const usesSharedLayers = (layers: unknown) =>
  Array.isArray(layers) &&
  layers.some((layer) => {
    const target = (layer as { 'Fn::GetAtt'?: unknown })?.['Fn::GetAtt'];
    return Array.isArray(target) && SHARED_LAYER_LOGICAL_NAMES.has(target[0]);
  });

const templateTagValue = (tags: unknown, key: string) => {
  const value = Array.isArray(tags)
    ? (tags as { Key?: unknown; Value?: unknown }[]).find((tag) => tag?.Key === key)?.Value
    : undefined;
  return typeof value === 'string' ? value : undefined;
};

/**
 * The artifact digest of the code a function runs: its live tags, read as a fast deployment reads them, or the deployed
 * template's tags when the live ones say nothing. `updating` means an update of its code did not finish.
 */
export const getRunningArtifactDigest = ({
  liveTags,
  templateTags
}: {
  liveTags: { key?: string; value?: string }[] | undefined;
  templateTags: unknown;
}) => {
  const tag = (key: string) => getTagValue(liveTags, key) ?? templateTagValue(templateTags, key);
  const layers = parseSharedLayersTag(tag(tagNames.sharedLayers())) ?? new Map<number, string>();
  return getDeployedArtifactDigest(
    tag(tagNames.artifactDigest()),
    tag(tagNames.codeDigest()),
    [...layers].map(([layerNumber, identity]) => ({ layerNumber, identity }))
  );
};

export const decideSkippedFunctionCode = ({
  functions,
  skippedFunctionNames,
  deployedTemplate,
  deployedTags,
  storedObjects
}: {
  functions: { name: string; cfLogicalName: string }[];
  skippedFunctionNames: ReadonlySet<string>;
  /** The template the dev stack runs; none for a dev stack that does not exist yet. */
  deployedTemplate: Template | undefined;
  /** The tags each deployed function carries now, by logical name. */
  deployedTags: (cfLogicalName: string) => { key?: string; value?: string }[] | undefined;
  /** The objects in the deployment bucket. */
  storedObjects: { s3Key: string; name: string; digest: string | null; version: string | null }[];
}): SkippedFunctionCode[] =>
  functions
    .filter(({ name }) => skippedFunctionNames.has(name))
    .map(({ name, cfLogicalName }): SkippedFunctionCode => {
      const resource = deployedTemplate?.Resources?.[cfLogicalName] as TemplateResource | undefined;
      const templateS3Key = (resource?.Properties?.Code as { S3Key?: unknown } | undefined)?.S3Key;
      const templateDigest =
        typeof templateS3Key === 'string' ? parseBucketObjectS3Key(templateS3Key)?.digest : undefined;
      if (resource?.Type !== 'AWS::Lambda::Function' || typeof templateS3Key !== 'string' || !templateDigest) {
        return { name, build: 'not-deployed' };
      }
      if (usesSharedLayers(resource.Properties?.Layers)) return { name, build: 'uses-shared-layers' };
      const digest =
        getRunningArtifactDigest({ liveTags: deployedTags(cfLogicalName), templateTags: resource.Properties?.Tags }) ??
        templateDigest;
      if (digest === 'updating') return { name, build: 'code-unknown' };
      // The template's own object when the function runs it, else the newest stored object of the code it runs. The
      // object must exist: CloudFormation reads it to deploy changed code and when it replaces the function.
      const s3Key =
        digest === templateDigest && storedObjects.some((object) => object.s3Key === templateS3Key)
          ? templateS3Key
          : storedObjects
              .filter((object) => object.name === name && object.digest === digest)
              .toSorted((left, right) => (right.version ?? '').localeCompare(left.version ?? ''))
              .at(0)?.s3Key;
      if (!s3Key) return { name, build: 'stored-code-missing' };
      return {
        name,
        keep: {
          s3Key,
          digest,
          identityTags: [
            { name: tagNames.codeDigest(), value: digest },
            { name: tagNames.artifactDigest(), value: digest }
          ]
        }
      };
    });

const IDENTITY_TAG_KEYS = new Set([tagNames.codeDigest(), tagNames.artifactDigest(), tagNames.sharedLayers()]);

/**
 * A resource as far as the kept code depends on it: without what says which code it runs (the code's S3 object, its
 * identity tags, a version publisher's `codeDigest`) and without `DependsOn`, which orders the deployment only.
 */
const withoutCodeIdentity = (resource: unknown) => {
  if (!resource || typeof resource !== 'object') return resource;
  const { DependsOn: _dependsOn, Properties, ...rest } = resource as TemplateResource;
  if (!Properties) return rest;
  const { Code: _code, codeDigest: _codeDigest, Tags, ...properties } = Properties;
  return {
    ...rest,
    Properties: {
      ...properties,
      ...(Array.isArray(Tags)
        ? { Tags: Tags.filter((tag) => !IDENTITY_TAG_KEYS.has((tag as { Key?: string })?.Key ?? '')) }
        : Tags === undefined
          ? {}
          : { Tags })
    }
  };
};

const same = (left: unknown, right: unknown) =>
  JSON.stringify(canonical(withoutCodeIdentity(left))) === JSON.stringify(canonical(withoutCodeIdentity(right)));

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])])
    );
  return value;
};

/** The logical names `Ref`, `Fn::GetAtt` and `Fn::Sub` point at anywhere inside `value`. */
const referencedLogicalNames = (value: unknown, found = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) value.forEach((item) => referencedLogicalNames(item, found));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'Ref' && typeof item === 'string') found.add(item);
      else if (key === 'Fn::GetAtt' && Array.isArray(item) && typeof item[0] === 'string') found.add(item[0]);
      else if (key === 'Fn::GetAtt' && typeof item === 'string') found.add(item.split('.')[0]!);
      else if (key === 'Fn::Sub') {
        const text = Array.isArray(item) ? item[0] : item;
        if (typeof text === 'string')
          for (const [, name] of text.matchAll(/\$\{([A-Za-z0-9]+)[.}]/g)) if (name) found.add(name);
        referencedLogicalNames(item, found);
      } else referencedLogicalNames(item, found);
    }
  }
  return found;
};

const policyStatements = (role: unknown) =>
  (
    (role as TemplateResource | undefined)?.Properties?.Policies as
      | { PolicyDocument?: { Statement?: unknown[] } }[]
      | undefined
  )?.flatMap(({ PolicyDocument }) => PolicyDocument?.Statement ?? []) ?? [];

/**
 * The kept functions whose deployment changes in anything but which code it runs. Compared with the deployed template:
 *
 * - the function resource itself (environment, handler, runtime, memory, timeout, VPC, layers, role, tags);
 * - its role, apart from policy statements it loses, and every other resource the function owns that still exists;
 * - the resources its environment refers to, whose values it receives.
 *
 * Leaving a function out removes its triggers and the permissions they need, so a removed child resource or a removed
 * policy statement is not a change. Anything added or altered is.
 */
export const findKeptFunctionsWithChangedConfiguration = ({
  functions,
  ownedLogicalNames,
  template,
  deployedTemplate
}: {
  functions: { name: string; cfLogicalName: string }[];
  /** The resources each function owns in `template`, by function name. */
  ownedLogicalNames: (name: string) => string[];
  template: Template;
  deployedTemplate: Template;
}): string[] => {
  const resource = (from: Template, logicalName: string) =>
    from.Resources?.[logicalName] as TemplateResource | undefined;
  return functions
    .filter(({ name, cfLogicalName }) => {
      const next = resource(template, cfLogicalName);
      const deployed = resource(deployedTemplate, cfLogicalName);
      if (!next || !deployed || !same(next, deployed)) return true;
      const role = (next.Properties?.Role as { 'Fn::GetAtt'?: unknown[] } | undefined)?.['Fn::GetAtt']?.[0];
      if (typeof role === 'string') {
        const nextRole = resource(template, role);
        const deployedRole = resource(deployedTemplate, role);
        if (!nextRole || !deployedRole) return true;
        const withoutPolicies = (value: TemplateResource) => ({
          ...value,
          Properties: { ...value.Properties, Policies: undefined }
        });
        if (!same(withoutPolicies(nextRole), withoutPolicies(deployedRole))) return true;
        const deployedStatements = new Set(policyStatements(deployedRole).map((s) => JSON.stringify(canonical(s))));
        if (policyStatements(nextRole).some((s) => !deployedStatements.has(JSON.stringify(canonical(s))))) return true;
      }
      const owned = ownedLogicalNames(name).filter(
        (logicalName) => logicalName !== cfLogicalName && logicalName !== role
      );
      // Pseudo parameters (`AWS::Region`) and parameters are not resources.
      const referenced = [...referencedLogicalNames(next.Properties?.Environment)].filter(
        (logicalName) => resource(template, logicalName) !== undefined
      );
      return [...owned, ...referenced].some((logicalName) => {
        const nextOwned = resource(template, logicalName);
        const deployedOwned = resource(deployedTemplate, logicalName);
        return !deployedOwned || !same(nextOwned, deployedOwned);
      });
    })
    .map(({ name }) => name);
};
