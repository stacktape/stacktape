import type { CacheBehavior } from '@cloudform/cloudFront/distribution';
import type Distribution from '@cloudform/cloudFront/distribution';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import CloudfrontFunction from '@cloudform/cloudFront/function';
import { GetAtt, Ref } from '@cloudform/functions';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { fsPaths } from '@shared/naming/fs-paths';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { EDGE_LAMBDA_ENV_ASSET_REPLACER_PLACEHOLDER } from '@shared/utils/constants';
import { getCfEnvironment, transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { readdir, stat } from 'fs-extra';
import { getResolvedConnectToEnvironmentVariables } from '../_utils/connect-to-helper';
import { getCustomResource, getStpServiceCustomResource } from '../_utils/custom-resource';
import { resolveDirectivesForEnvironmentVariables } from '../_utils/env-vars';

export const getHostHeaderRewriteCloudfrontFunction = (nextjsWeb: StpNextjsWeb) => {
  return new CloudfrontFunction({
    Name: awsResourceNames.openNextHostHeaderRewriteFunction(
      nextjsWeb.name,
      globalStateManager.targetStack.stackName,
      globalStateManager.region
    ),
    AutoPublish: true,
    FunctionCode:
      '\nfunction handler(event) {\n  var request = event.request;\n  request.headers["x-forwarded-host"] = request.headers.host;\n  \n  return request;\n}',
    FunctionConfig: {
      Comment: nextjsWeb.name,
      Runtime: 'cloudfront-js-1.0'
    }
  });
};

export const getAssetReplacerResource = (nextjsWeb: StpNextjsWeb) => {
  return getStpServiceCustomResource<'assetReplacer'>({
    assetReplacer: {
      bucketName: Ref(cfLogicalNames.deploymentBucket()),
      zipFileS3Key: '<<TBD>>',
      replacements: [
        {
          includeFilesPattern: '**/*.@(*js|json|html)',
          searchString: '{{ CACHE_BUCKET_NAME }}',
          replaceString: Ref(cfLogicalNames.bucket(nextjsWeb._nestedResources.bucket.name)) as unknown as string
        },
        {
          includeFilesPattern: '**/*.@(*js|json|html)',
          searchString: '{{ CACHE_BUCKET_KEY_PREFIX }}',
          replaceString: '_cache'
        },
        {
          includeFilesPattern: '**/*.@(*js|json|html)',
          searchString: '{{ CACHE_BUCKET_REGION }}',
          replaceString: globalStateManager.region
        }
      ]
    }
  });
};

export const getDynamoInsertCustomResource = (nextjsWeb: StpNextjsWeb) => {
  return getCustomResource<{ version: number }>({
    serviceToken: GetAtt(nextjsWeb._nestedResources.revalidationInsertFunction.cfLogicalName, 'Arn'),
    properties: { version: Date.now() }
  });
};

export const getCacheBehaviourTemplateOverride =
  (nextjsWeb: StpNextjsWeb) => async (template: CloudformationTemplate) => {
    const assetsDirPath = join(
      fsPaths.absoluteNextjsBuiltProjectFolderPath({
        stpResourceName: nextjsWeb.name,
        invocationId: globalStateManager.invocationId
      }),
      'bucket-content',
      '_assets'
    );
    const assetsDirContents = await readdir(assetsDirPath);
    const newCacheBehaviours = await Promise.all(
      assetsDirContents.map(async (item) => ({
        PathPattern: await stat(join(assetsDirPath, item)).then((info) => (info.isDirectory() ? `${item}/*` : item))
      }))
    );

    for (let distributionIndex = 0; ; distributionIndex += 1) {
      const cfLogicalNameOfResourceToModify = cfLogicalNames.cloudfrontDistribution(nextjsWeb.name, distributionIndex);
      const distribution = template.Resources[cfLogicalNameOfResourceToModify] as Distribution | undefined;
      if (!distribution) {
        break;
      }

      const cacheBehaviors = distribution.Properties.DistributionConfig.CacheBehaviors as CacheBehavior[];
      const staticBehaviourIndex = cacheBehaviors.findIndex(({ PathPattern }) => PathPattern === '<<TBD_STATIC>>');
      if (staticBehaviourIndex === -1) {
        continue;
      }

      const [staticFilesCacheBehaviour] = cacheBehaviors.splice(staticBehaviourIndex, 1);

      // due to override being idempotent, we must search and replace behaviours for given path patterns if they already exist
      newCacheBehaviours.forEach((behaviour) => {
        const existingBehaviourIndex = cacheBehaviors.findIndex(
          ({ PathPattern }) => PathPattern === behaviour.PathPattern
        );
        if (existingBehaviourIndex === -1) {
          cacheBehaviors.push({ ...staticFilesCacheBehaviour, ...behaviour });
          return;
        }
        cacheBehaviors[existingBehaviourIndex] = { ...staticFilesCacheBehaviour, ...behaviour };
      });
    }
  };

export const getDistributionRootObjectTemplateOverride =
  (nextjsWeb: StpNextjsWeb) => async (template: CloudformationTemplate) => {
    for (let distributionIndex = 0; ; distributionIndex += 1) {
      const cfLogicalNameOfResourceToModify = cfLogicalNames.cloudfrontDistribution(nextjsWeb.name, distributionIndex);
      const distribution = template.Resources[cfLogicalNameOfResourceToModify] as Distribution | undefined;
      if (!distribution) {
        break;
      }
      distribution.Properties.DistributionConfig.DefaultRootObject = '';
    }
  };

export const getAssetReplacerTemplateOverride =
  (nextjsWeb: StpNextjsWeb) => async (template: CloudformationTemplate) => {
    const targetLambda = nextjsWeb._nestedResources.serverFunction || nextjsWeb._nestedResources.serverEdgeFunction;
    const { s3Key } = deploymentArtifactManager.getLambdaS3UploadInfo({
      artifactName: targetLambda.name,
      packaging: targetLambda.packaging
    });

    const assetReplacerCfResourceProperties = template.Resources[
      cfLogicalNames.openNextAssetReplacerCustomResource(nextjsWeb.name)
    ].Properties as StpServiceCustomResourceProperties;

    assetReplacerCfResourceProperties.assetReplacer.zipFileS3Key = s3Key;

    if (nextjsWeb._nestedResources.serverEdgeFunction) {
      const variablesToInject = getResolvedConnectToEnvironmentVariables({
        connectTo: nextjsWeb.connectTo,
        localResolve: false
      });
      const envVars = [
        ...(await resolveDirectivesForEnvironmentVariables({
          vars: getCfEnvironment(nextjsWeb.environment),
          useLocalResolve: false
        })),
        ...variablesToInject
      ];

      const varsObj = envVars.reduce((acc, { Name, Value }) => {
        acc[Name] = Value;
        return acc;
      }, {});

      assetReplacerCfResourceProperties.assetReplacer.replacements.push({
        includeFilesPattern: 'index-wrap.mjs',
        searchString: EDGE_LAMBDA_ENV_ASSET_REPLACER_PLACEHOLDER,
        replaceString: transformIntoCloudformationSubstitutedString({
          ...varsObj,
          CACHE_BUCKET_NAME: Ref(cfLogicalNames.bucket(nextjsWeb._nestedResources.bucket.name)),
          CACHE_BUCKET_KEY_PREFIX: '_cache',
          CACHE_BUCKET_REGION: globalStateManager.region,
          REVALIDATION_QUEUE_URL: Ref(cfLogicalNames.sqsQueue(nextjsWeb._nestedResources.revalidationQueue.name)),
          REVALIDATION_QUEUE_REGION: globalStateManager.region,
          CACHE_DYNAMO_TABLE: Ref(cfLogicalNames.dynamoGlobalTable(nextjsWeb._nestedResources.revalidationTable.name))
        }) as unknown as string
      });
    }
    // adding dependency
    const dependentResourceCfLogicalName = nextjsWeb._nestedResources.serverEdgeFunction
      ? cfLogicalNames.customResourceEdgeLambda(nextjsWeb._nestedResources.serverEdgeFunction.name)
      : cfLogicalNames.lambda(nextjsWeb._nestedResources.serverFunction.name);

    template.Resources[dependentResourceCfLogicalName].DependsOn = (
      (template.Resources[dependentResourceCfLogicalName].DependsOn || []) as string[]
    ).concat(cfLogicalNames.openNextAssetReplacerCustomResource(nextjsWeb.name));
  };
