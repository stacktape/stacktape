/**
 * Which functions a dev stack update leaves on the code they run, instead of building them.
 *
 * A dev session that leaves functions out (`--resources`, `--skip-resources`) does not run them, so the dev stack does
 * not build them either: a function the developer deliberately left out may not even build. The dev stack keeps such a
 * function's code: the template names the same S3 object and the same code settings as the deployed one, so
 * CloudFormation does not touch its code, which may be what CloudFormation deployed or what an earlier session
 * deployed directly. The function is built only when the dev stack cannot keep its code: the function is new, its
 * stored object is gone, or it uses the shared layers older dev stacks built (dev stacks no longer build them, so the
 * layers disappear from the template).
 */
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { tagNames } from '@stacktape/naming/tag-names';
import { SHARED_LAYER_NUMBERS, getTagValue } from './shared-layers';
import { parseBucketObjectS3Key } from './utils';

/** The properties of a function that belong to its code: a kept function gets them from the deployed template. */
export const KEPT_CODE_PROPERTIES = ['Handler', 'Runtime', 'Architectures', 'Layers'] as const;

export type KeptFunctionCode = {
  /** The stored object the deployed template names. */
  s3Key: string;
  /** The digest in that object's key. */
  digest: string;
  /** The code identity tags the function carries now; a session that deployed code directly wrote them. */
  identityTags: { name: string; value: string }[];
  /** `KEPT_CODE_PROPERTIES` of the deployed function; an absent one stays absent. */
  properties: Partial<Record<(typeof KEPT_CODE_PROPERTIES)[number], unknown>>;
};

export type SkippedFunctionBuildReason = 'not-deployed' | 'stored-code-missing' | 'uses-shared-layers';

export type SkippedFunctionCode =
  | { name: string; keep: KeptFunctionCode }
  | { name: string; build: SkippedFunctionBuildReason };

type TemplateResource = { Type?: string; Properties?: Record<string, unknown> };

const SHARED_LAYER_LOGICAL_NAMES = new Set(
  SHARED_LAYER_NUMBERS.map((number) => cfLogicalNames.sharedChunkLayer(number))
);

const usesSharedLayers = (layers: unknown) =>
  Array.isArray(layers) &&
  layers.some((layer) => {
    const target = (layer as { 'Fn::GetAtt'?: unknown })?.['Fn::GetAtt'];
    return Array.isArray(target) && SHARED_LAYER_LOGICAL_NAMES.has(target[0]);
  });

const templateTagValue = (tags: unknown, key: string) =>
  Array.isArray(tags)
    ? (tags as { Key?: unknown; Value?: unknown }[]).find((tag) => tag?.Key === key)?.Value
    : undefined;

export const decideSkippedFunctionCode = ({
  functions,
  skippedFunctionNames,
  deployedTemplate,
  deployedTags,
  storedS3Keys
}: {
  functions: { name: string; cfLogicalName: string }[];
  skippedFunctionNames: ReadonlySet<string>;
  /** The template the dev stack runs; none for a dev stack that does not exist yet. */
  deployedTemplate: { Resources?: Record<string, unknown> } | undefined;
  /** The tags each deployed function carries now, by logical name. */
  deployedTags: (cfLogicalName: string) => { key?: string; value?: string }[] | undefined;
  /** The objects in the deployment bucket. */
  storedS3Keys: ReadonlySet<string>;
}): SkippedFunctionCode[] =>
  functions
    .filter(({ name }) => skippedFunctionNames.has(name))
    .map(({ name, cfLogicalName }): SkippedFunctionCode => {
      const resource = deployedTemplate?.Resources?.[cfLogicalName] as TemplateResource | undefined;
      const s3Key = (resource?.Properties?.Code as { S3Key?: unknown } | undefined)?.S3Key;
      const digest = typeof s3Key === 'string' ? parseBucketObjectS3Key(s3Key)?.digest : undefined;
      if (resource?.Type !== 'AWS::Lambda::Function' || typeof s3Key !== 'string' || !digest) {
        return { name, build: 'not-deployed' };
      }
      if (usesSharedLayers(resource.Properties?.Layers)) return { name, build: 'uses-shared-layers' };
      // CloudFormation reads the object again when it has to replace the function.
      if (!storedS3Keys.has(s3Key)) return { name, build: 'stored-code-missing' };
      const tags = deployedTags(cfLogicalName);
      const identityTag = (key: string) => {
        const value = getTagValue(tags, key) ?? templateTagValue(resource.Properties?.Tags, key);
        return typeof value === 'string' ? value : digest;
      };
      return {
        name,
        keep: {
          s3Key,
          digest,
          identityTags: [
            { name: tagNames.codeDigest(), value: identityTag(tagNames.codeDigest()) },
            { name: tagNames.artifactDigest(), value: identityTag(tagNames.artifactDigest()) }
          ],
          properties: Object.fromEntries(
            KEPT_CODE_PROPERTIES.flatMap((property) =>
              resource.Properties?.[property] === undefined ? [] : [[property, resource.Properties[property]]]
            )
          )
        }
      };
    });
