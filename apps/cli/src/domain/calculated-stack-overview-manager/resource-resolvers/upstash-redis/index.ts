import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Join } from '@cloudform/functions';
import { SUPPORTED_CF_INFRASTRUCTURE_MODULES } from '@config';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { stpErrors } from '@errors';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { getSsmParameterNameForThirdPartyCredentials } from '@shared/naming/ssm-secret-parameters';
import {
  PARENT_IDENTIFIER_SHARED_GLOBAL,
  THIRD_PARTY_PROVIDER_CREDENTIALS_REGION,
  UPSTASH_PROVIDER_DEFAULT_CREDENTIALS_ID
} from '@shared/utils/constants';
import { getStpServiceCustomResource } from '../_utils/custom-resource';
import { getUpstashDatabaseResource } from './utils';

export const resolveUpstashRedisDatabases = async () => {
  const { upstashRedisDatabases } = configManager;

  if (upstashRedisDatabases.length) {
    if (
      configManager.requireUpstashCredentialsParameter &&
      !templateManager.getCfResourceFromTemplate(cfLogicalNames.upstashCredentialsProvider())
    ) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.upstashCredentialsProvider(),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
        resource: getStpServiceCustomResource<'ssmParameterRetrieve'>({
          ssmParameterRetrieve: {
            parameterName: getSsmParameterNameForThirdPartyCredentials({
              credentialsIdentifier: UPSTASH_PROVIDER_DEFAULT_CREDENTIALS_ID,
              region: THIRD_PARTY_PROVIDER_CREDENTIALS_REGION
            }),
            region: THIRD_PARTY_PROVIDER_CREDENTIALS_REGION,
            parseAsJson: true
          }
        })
      });
    }

    const existingUpstashDeploymentMajorVersionMetadata = deployedStackOverviewManager.getStackMetadata(
      stackMetadataNames.upstashRedisPrivateTypesMajorVersionUsed()
    );
    // this is to detect if the previous deployment of the stack was made with modules with different majorVersion
    // if so, the update should be halted, because updating stack might replace some resources, that you do not wish to replace
    // AFAIK this situation does not need to happen next few years if upstash provider does not decide to do something crazy
    if (
      stackManager.stackActionType === 'update' &&
      existingUpstashDeploymentMajorVersionMetadata !== undefined &&
      existingUpstashDeploymentMajorVersionMetadata !==
        SUPPORTED_CF_INFRASTRUCTURE_MODULES.upstashRedis.privateTypesMajorVersionUsed
    ) {
      throw stpErrors.e22({
        moduleMajorVersionDeployed: existingUpstashDeploymentMajorVersionMetadata as string,
        moduleType: 'upstashRedis',
        moduleMajorVersionUsedByStacktape:
          SUPPORTED_CF_INFRASTRUCTURE_MODULES.upstashRedis.privateTypesMajorVersionUsed,
        region: globalStateManager.region,
        stackName: globalStateManager.targetStack.stackName
      });
    }

    // adding metadata which will inform us about the major version of modules used in this stack
    calculatedStackOverviewManager.addStackMetadata({
      metaName: stackMetadataNames.upstashRedisPrivateTypesMajorVersionUsed(),
      metaValue: SUPPORTED_CF_INFRASTRUCTURE_MODULES.upstashRedis.privateTypesMajorVersionUsed,
      showDuringPrint: false
    });

    upstashRedisDatabases.forEach((resource) => {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.upstashRedisDatabase(resource.name),
        nameChain: resource.nameChain,
        resource: getUpstashDatabaseResource(resource)
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'host',
        paramValue: GetAtt(cfLogicalNames.upstashRedisDatabase(resource.name), 'Endpoint'),
        nameChain: resource.nameChain,
        showDuringPrint: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'port',
        paramValue: GetAtt(cfLogicalNames.upstashRedisDatabase(resource.name), 'Port'),
        nameChain: resource.nameChain,
        showDuringPrint: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'password',
        paramValue: GetAtt(cfLogicalNames.upstashRedisDatabase(resource.name), 'Password'),
        nameChain: resource.nameChain,
        showDuringPrint: true,
        sensitive: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'restToken',
        paramValue: GetAtt(cfLogicalNames.upstashRedisDatabase(resource.name), 'RestToken'),
        nameChain: resource.nameChain,
        showDuringPrint: true,
        sensitive: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'readOnlyRestToken',
        paramValue: GetAtt(cfLogicalNames.upstashRedisDatabase(resource.name), 'ReadOnlyRestToken'),
        nameChain: resource.nameChain,
        showDuringPrint: true,
        sensitive: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'restUrl',
        paramValue: Join('', [
          'https://',
          GetAtt(cfLogicalNames.upstashRedisDatabase(resource.name), 'Endpoint'),
          ':',
          GetAtt(cfLogicalNames.upstashRedisDatabase(resource.name), 'Port')
        ]),
        nameChain: resource.nameChain,
        showDuringPrint: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'redisUrl',
        paramValue: Join('', [
          'rediss://:',
          GetAtt(cfLogicalNames.upstashRedisDatabase(resource.name), 'Password'),
          '@',
          GetAtt(cfLogicalNames.upstashRedisDatabase(resource.name), 'Endpoint'),
          ':',
          GetAtt(cfLogicalNames.upstashRedisDatabase(resource.name), 'Port')
        ]),
        nameChain: resource.nameChain,
        showDuringPrint: true,
        sensitive: true
      });
      calculatedStackOverviewManager.addStacktapeResourceLink({
        nameChain: resource.nameChain,
        linkName: 'metrics',
        linkValue: Join('', [
          'https://console.upstash.com/redis/',
          GetAtt(cfLogicalNames.upstashRedisDatabase(resource.name), 'DatabaseID')
        ])
      });
    });
  }
};
