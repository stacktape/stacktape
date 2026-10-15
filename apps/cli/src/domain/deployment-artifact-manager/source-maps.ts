import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { SourceMapManifest } from '@stacktape/console-api/source-maps';
import { sourceMapObjectKey } from '@stacktape/console-api/source-maps';
import { getDeploymentBucketObjectType, parseBucketObjectS3Key } from './utils';

/**
 * Where the source maps of the artifact stored at `s3Key` are kept: a function ZIP's under its name and digest, a
 * shared layer's under its name and content hash. Anything else has no maps.
 */
export const sourceMapKeyForArtifact = (s3Key: string): string | undefined => {
  const artifact = parseBucketObjectS3Key(s3Key);
  if (!artifact || artifact.extension !== 'zip' || getDeploymentBucketObjectType(artifact.name) !== 'user-lambda') {
    return undefined;
  }
  return sourceMapObjectKey({ artifactName: artifact.name, digest: artifact.digest ?? artifact.version });
};

/**
 * Stored map bundles no remaining artifact needs. A bundle lives exactly as long as an artifact with its digest, so the
 * maps of every retained release, which a rollback restores, stay available.
 */
export const selectObsoleteSourceMapKeys = ({
  storedKeys,
  remainingArtifactKeys
}: {
  storedKeys: Iterable<string>;
  remainingArtifactKeys: string[];
}) => {
  const needed = new Set(remainingArtifactKeys.map(sourceMapKeyForArtifact));
  return [...storedKeys].filter((key) => !needed.has(key));
};

/**
 * Which stored source maps describe each function of `template`: its own code's and its Stacktape layers'. The
 * template is the one being deployed, so a CloudFormation deployment, a fast release and a rollback are described the
 * same way. Only maps present in the bucket (`storedKeys`) are named; a function with none is left out.
 */
export const getSourceMapManifest = ({
  template,
  deploymentBucketName,
  storedKeys
}: {
  template: CloudFormationTemplate;
  deploymentBucketName: string;
  storedKeys: ReadonlySet<string>;
}): SourceMapManifest => {
  const storedKeyOf = (location: { S3Bucket?: unknown; S3Key?: unknown } | undefined) => {
    if (location?.S3Bucket !== deploymentBucketName || typeof location.S3Key !== 'string') return undefined;
    const key = sourceMapKeyForArtifact(location.S3Key);
    return key && storedKeys.has(key) ? key : undefined;
  };
  const functions: SourceMapManifest['functions'] = [];
  for (const resource of Object.values(template.Resources)) {
    if (resource.Type !== 'AWS::Lambda::Function') continue;
    const properties = (resource.Properties ?? {}) as {
      FunctionName?: unknown;
      Code?: { S3Bucket?: unknown; S3Key?: unknown };
      Layers?: unknown[];
    };
    const digest = typeof properties.Code?.S3Key === 'string' && parseBucketObjectS3Key(properties.Code.S3Key)?.digest;
    if (typeof properties.FunctionName !== 'string' || !digest) continue;
    const layerKeys = (properties.Layers ?? []).map((layer) => {
      const [logicalId, attribute] = (layer as { 'Fn::GetAtt'?: [string, string] })?.['Fn::GetAtt'] ?? [];
      const layerResource = logicalId && attribute === 'LayerVersionArn' ? template.Resources[logicalId] : undefined;
      return layerResource?.Type === 'AWS::Lambda::LayerVersion'
        ? storedKeyOf((layerResource.Properties as { Content?: { S3Bucket?: unknown; S3Key?: unknown } }).Content)
        : undefined;
    });
    const sourceMapKeys = [storedKeyOf(properties.Code), ...layerKeys].filter((key): key is string => Boolean(key));
    if (sourceMapKeys.length) functions.push({ lambdaName: properties.FunctionName, digest, sourceMapKeys });
  }
  return { functions };
};
