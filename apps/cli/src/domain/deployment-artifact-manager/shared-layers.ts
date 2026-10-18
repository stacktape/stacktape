/**
 * How a deployment knows which shared chunk layer content each function runs.
 *
 * CloudFormation publishes a layer version from the layer's S3 object, whose key names the content
 * (`shared-layer-1/<hash>.zip`), and gives every function that uses it the version's ARN. A fast deployment publishes
 * the version itself and points the functions at it, so the stack's template no longer says what the functions run.
 * The `stp:shared-layers` tag of each function does: it names the content hash of every shared layer the function was
 * last given, written by CloudFormation from the template and by a fast deployment after a direct update, exactly as
 * the code digest tag follows the function's own code.
 */
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { tagNames } from '@stacktape/naming/tag-names';

export type SharedLayerContent = { layerNumber: number; identity: string };

/** The most shared layers a function can have: the native-dependency layer 0 and chunk layers 1 to 5. */
export const SHARED_LAYER_NUMBERS = [0, 1, 2, 3, 4, 5];

/**
 * A shared layer's content identity: the hash segment of its S3 key, `shared-layer-1/<hash>.zip`. A copy a release
 * made of the object, `shared-layer-1/<hash>-<version>.zip`, holds the same content and has the same identity.
 */
export const sharedLayerIdentity = (s3Key: string): string =>
  s3Key
    .slice(s3Key.lastIndexOf('/') + 1)
    .replace(/\.zip$/, '')
    .split('-')[0]!;

/**
 * The key of a copy of a layer object made for release `version`. A template that names the copy makes CloudFormation
 * publish a new version of the layer from the same content and give it to every function that uses the layer, in the
 * same update as the functions' code. See `needsLayerRepublish`.
 */
export const buildRepublishedLayerS3Key = (s3Key: string, version: string): string =>
  `${s3Key.slice(0, s3Key.lastIndexOf('/') + 1)}${sharedLayerIdentity(s3Key)}-${version}.zip`;

/**
 * Whether a full deployment must make CloudFormation republish a layer although its content did not change: some
 * function runs a version a fast deployment published, and CloudFormation would leave the function's layers alone when
 * only its code changes. When the content differs from CloudFormation's, it replaces the layer anyway.
 */
export const needsLayerRepublish = ({
  identity,
  cfnIdentity,
  deployedIdentities
}: {
  identity: string;
  cfnIdentity: string | undefined;
  /** What each function using the layer runs; `undefined` for a function CloudFormation gives the layer anyway. */
  deployedIdentities: (string | undefined)[];
}): boolean =>
  cfnIdentity === identity && deployedIdentities.some((deployed) => deployed !== undefined && deployed !== identity);

/** The shared layer number of a template resource, or `undefined` for any other resource. */
export const sharedLayerNumberOf = (cfLogicalName: string): number | undefined =>
  SHARED_LAYER_NUMBERS.find((layerNumber) => cfLogicalNames.sharedChunkLayer(layerNumber) === cfLogicalName);

/**
 * `<layer number>:<content hash>` per layer, separated by `/`: a tag value may hold letters, digits, spaces and
 * `+ - = . _ : / @`, so a comma would make Lambda reject the tag.
 */
export const formatSharedLayersTag = (layers: SharedLayerContent[]): string =>
  [...layers]
    .sort((left, right) => left.layerNumber - right.layerNumber)
    .map(({ layerNumber, identity }) => `${layerNumber}:${identity}`)
    .join('/');

/** The layers a function's tag records, or `undefined` when the function carries no such tag. */
export const parseSharedLayersTag = (value: string | undefined): Map<number, string> | undefined => {
  if (value === undefined) return undefined;
  // Every reader must restore unknown content, including full deployments and rollback, which would otherwise
  // leave an unchanged CloudFormation layer reference alone.
  if (value === 'updating') return new Map(SHARED_LAYER_NUMBERS.map((layerNumber) => [layerNumber, value]));
  const layers = new Map<number, string>();
  for (const entry of value.split('/').filter(Boolean)) {
    const [layerNumber, identity] = entry.split(':');
    if (layerNumber !== undefined && identity && /^\d+$/.test(layerNumber)) layers.set(Number(layerNumber), identity);
  }
  return layers;
};

export const getTagValue = (tags: { key?: string; value?: string }[] | undefined, key: string) =>
  tags?.find((tag) => tag.key === key)?.value;

type TemplateResource = { Type?: string; Properties?: Record<string, unknown> };

/**
 * The shared layer content a template gives a function: each `Fn::GetAtt` of a shared layer resource in its `Layers`
 * resolves to that resource's S3 key. This is what a function runs after CloudFormation applied the template, and
 * what a function without a `stp:shared-layers` tag runs.
 */
export const getSharedLayersOfFunctionInTemplate = (
  template: Pick<CloudFormationTemplate, 'Resources'>,
  functionLogicalName: string
): Map<number, string> => {
  const resources = (template.Resources ?? {}) as Record<string, TemplateResource>;
  const layers = new Map<number, string>();
  const references = (resources[functionLogicalName]?.Properties?.Layers ?? []) as unknown[];
  for (const reference of references) {
    const target = (reference as { 'Fn::GetAtt'?: unknown })?.['Fn::GetAtt'];
    const layerLogicalName = Array.isArray(target) ? target[0] : undefined;
    if (typeof layerLogicalName !== 'string') continue;
    const layerNumber = sharedLayerNumberOf(layerLogicalName);
    const s3Key = (resources[layerLogicalName]?.Properties?.Content as { S3Key?: unknown } | undefined)?.S3Key;
    if (layerNumber !== undefined && typeof s3Key === 'string') layers.set(layerNumber, sharedLayerIdentity(s3Key));
  }
  return layers;
};

/** The shared chunk layers a template declares, by number and AWS layer name. */
export const getSharedLayersOfTemplate = (
  template: Pick<CloudFormationTemplate, 'Resources'>
): { layerNumber: number; layerName: string }[] => {
  const resources = (template.Resources ?? {}) as Record<string, TemplateResource>;
  return SHARED_LAYER_NUMBERS.flatMap((layerNumber) => {
    const layerName = resources[cfLogicalNames.sharedChunkLayer(layerNumber)]?.Properties?.LayerName;
    return typeof layerName === 'string' ? [{ layerNumber, layerName }] : [];
  });
};

/** The shared layer content the function runs: its tag, or the template that deployed it when it has no tag. */
export const getDeployedSharedLayers = ({
  tags,
  deployedTemplate,
  functionLogicalName
}: {
  tags: { key?: string; value?: string }[] | undefined;
  deployedTemplate: Pick<CloudFormationTemplate, 'Resources'>;
  functionLogicalName: string;
}): Map<number, string> =>
  parseSharedLayersTag(getTagValue(tags, tagNames.sharedLayers())) ??
  getSharedLayersOfFunctionInTemplate(deployedTemplate, functionLogicalName);

/**
 * The `Layers` of a function as the template orders them, with every shared layer reference resolved to a version
 * ARN. Returns `undefined` when a reference cannot be resolved here, such as a user layer given by a CloudFormation
 * function; the caller then starts from the layers the function runs now.
 */
export const resolveTemplateLayerArns = (
  template: Pick<CloudFormationTemplate, 'Resources'>,
  functionLogicalName: string,
  sharedLayerArns: Map<number, string>
): string[] | undefined => {
  const resources = (template.Resources ?? {}) as Record<string, TemplateResource>;
  const references = (resources[functionLogicalName]?.Properties?.Layers ?? []) as unknown[];
  const arns: string[] = [];
  for (const reference of references) {
    if (typeof reference === 'string') {
      arns.push(reference);
      continue;
    }
    const target = (reference as { 'Fn::GetAtt'?: unknown })?.['Fn::GetAtt'];
    const layerNumber =
      Array.isArray(target) && typeof target[0] === 'string' ? sharedLayerNumberOf(target[0]) : undefined;
    const arn = layerNumber === undefined ? undefined : sharedLayerArns.get(layerNumber);
    if (!arn) return undefined;
    arns.push(arn);
  }
  return arns;
};

/** The name a layer version ARN belongs to: `arn:aws:lambda:eu-west-1:123456789012:layer:<name>:<version>`. */
export const layerNameOfArn = (arn: string): string | undefined => arn.split(':')[6];

/**
 * Starting from the layers a function runs now, replaces each shared layer's version with the given one, keeping
 * user and tracing layers where they are.
 */
export const replaceSharedLayerArns = (
  currentArns: string[],
  sharedLayerArns: { layerName: string; arn: string }[]
): string[] => {
  const replacements = new Map(sharedLayerArns.map(({ layerName, arn }) => [layerName, arn]));
  const arns = currentArns.map((arn) => {
    const name = layerNameOfArn(arn);
    return name !== undefined ? (replacements.get(name) ?? arn) : arn;
  });
  const present = new Set(arns.map(layerNameOfArn));
  for (const { layerName, arn } of sharedLayerArns) if (!present.has(layerName)) arns.push(arn);
  return arns;
};

const FAST_DEPLOYMENT_MARKER = 'stp:fast-deployment';

/**
 * The description of a layer version a fast deployment publishes. It names the content so a later deployment can
 * reuse the version, and marks the version as one Stacktape published outside CloudFormation and may delete.
 */
export const describeFastDeploymentLayerVersion = (templateDescription: string | undefined, identity: string) =>
  `${templateDescription ?? 'Shared chunk layer'} (${FAST_DEPLOYMENT_MARKER} ${identity})`;

/** The content of a layer version published by a fast deployment, or `undefined` for every other version. */
export const parseFastDeploymentLayerVersion = (description: string | undefined): string | undefined =>
  description?.match(new RegExp(`\\(${FAST_DEPLOYMENT_MARKER} ([^\\s)]+)\\)$`))?.[1];

/**
 * The versions a fast deployment published that nothing runs any more. Only versions carrying the marker are
 * candidates: CloudFormation's own version is never one, and neither is a version whose ARN a function still uses.
 */
export const selectSupersededLayerVersions = <Version extends { arn: string; description?: string }>({
  versions,
  arnsInUse
}: {
  versions: Version[];
  arnsInUse: Iterable<string>;
}): Version[] => {
  const inUse = new Set(arnsInUse);
  return versions.filter(
    ({ arn, description }) => parseFastDeploymentLayerVersion(description) !== undefined && !inUse.has(arn)
  );
};
