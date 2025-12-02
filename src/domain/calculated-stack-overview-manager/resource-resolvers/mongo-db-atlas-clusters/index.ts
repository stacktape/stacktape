import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Ref, Sub } from '@cloudform/functions';
import { SUPPORTED_CF_INFRASTRUCTURE_MODULES } from '@config';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { getSsmParameterNameForThirdPartyCredentials } from '@shared/naming/ssm-secret-parameters';
import {
  MONGODB_PROVIDER_DEFAULT_CREDENTIALS_ID,
  PARENT_IDENTIFIER_SHARED_GLOBAL,
  THIRD_PARTY_PROVIDER_CREDENTIALS_REGION
} from '@shared/utils/constants';
import { ExpectedError } from '@utils/errors';
import { getStpServiceCustomResource } from '../_utils/custom-resource';
import {
  getAtlasMongoClusterResource,
  getAtlasMongoMasterUserResource,
  getAtlasMongoNetworkContainerResource,
  getAtlasMongoNetworkPeeringResource,
  getAtlasMongoProjectIpAccessList,
  getAtlasMongoProjectResource,
  getAtlasMongoVpcRouteResource
} from './utils';

export const resolveAtlasMongoClusters = async () => {
  const { atlasMongoClusters } = configManager;
  // if there are some atlasMongo clusters we need to create project for them
  // we will also setup resources that are setup per project
  if (atlasMongoClusters.length) {
    const existingMongoDeploymentMajorVersionMetadata = deployedStackOverviewManager.getStackMetadata(
      stackMetadataNames.atlasMongoPrivateTypesMajorVersionUsed()
    );

    // this is to detect if the previous deployment of the stack was made with modules with different majorVersion
    // if so, the update should be halted, because updating stack might replace some resources, that you do not wish to replace
    // AFAIK this situation does not need to happen next few years if atlas mongo provider does not decide to do something crazy
    if (
      stackManager.stackActionType === 'update' &&
      existingMongoDeploymentMajorVersionMetadata !== undefined &&
      existingMongoDeploymentMajorVersionMetadata !==
        SUPPORTED_CF_INFRASTRUCTURE_MODULES.atlasMongo.privateTypesMajorVersionUsed
    ) {
      throw new ExpectedError(
        'EXISTING_STACK',
        `There is already a stack with name ${globalStateManager.targetStack.stackName} deployed in ${globalStateManager.region} which uses atlasMongo resources in major version "${existingMongoDeploymentMajorVersionMetadata}".\n` +
          `This version of stacktape uses major version "${SUPPORTED_CF_INFRASTRUCTURE_MODULES.atlasMongo.privateTypesMajorVersionUsed}". Updating stack might result in replacement of resources and data-loss.`
      );
    }
    if (configManager.requireAtlasCredentialsParameter) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.atlasMongoCredentialsProvider(),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
        resource: getStpServiceCustomResource<'ssmParameterRetrieve'>({
          ssmParameterRetrieve: {
            parameterName: getSsmParameterNameForThirdPartyCredentials({
              credentialsIdentifier: MONGODB_PROVIDER_DEFAULT_CREDENTIALS_ID,
              region: THIRD_PARTY_PROVIDER_CREDENTIALS_REGION
            }),
            region: THIRD_PARTY_PROVIDER_CREDENTIALS_REGION,
            parseAsJson: true
          }
        })
      });
    }
    // adding metadata which will inform us about the major version of modules used in this stack
    calculatedStackOverviewManager.addStackMetadata({
      metaName: stackMetadataNames.atlasMongoPrivateTypesMajorVersionUsed(),
      metaValue: SUPPORTED_CF_INFRASTRUCTURE_MODULES.atlasMongo.privateTypesMajorVersionUsed,
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.atlasMongoProject(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
      resource: getAtlasMongoProjectResource()
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.atlasMongoProjectIpAccessList(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
      resource: getAtlasMongoProjectIpAccessList()
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.atlasMongoProjectVpcNetworkContainer(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
      resource: getAtlasMongoNetworkContainerResource()
    });
    // this peering gets confirmed by our custom resource acceptVpcPeerings
    // stacktape automatically picks up (from configManager) that there is a cluster (and a peering) so we do not need to add custom resource here
    // we however need to add route into vpc route table, telling to push mongo traffic in the direction of mongo vpc.
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.atlasMongoProjectVpcNetworkPeering(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
      resource: getAtlasMongoNetworkPeeringResource()
    });

    // Only create routes if we're not reusing a VPC (when we create our own VPC)
    if (!configManager.reuseVpcConfig) {
      // Add routes to all public route tables (3 total)
      for (let i = 0; i < 3; i++) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.atlasMongoVpcRoute(true, i),
          nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
          resource: getAtlasMongoVpcRouteResource(true, i)
        });
      }

      // Add routes to all private route tables if they exist
      if (configManager.allResourcesRequiringPrivateSubnets.length > 0) {
        for (let i = 0; i < 3; i++) {
          calculatedStackOverviewManager.addCfChildResource({
            cfLogicalName: cfLogicalNames.atlasMongoVpcRoute(false, i),
            nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
            resource: getAtlasMongoVpcRouteResource(false, i)
          });
        }
      }
    }

    atlasMongoClusters.forEach((definition) => {
      const { name, nameChain } = definition;
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.atlasMongoCluster(name),
        nameChain,
        resource: getAtlasMongoClusterResource({ resource: definition, stpResourceName: name })
      });
      calculatedStackOverviewManager.addStacktapeResourceLink({
        linkName: 'metrics',
        nameChain,
        linkValue: Sub(
          `https://cloud.mongodb.com/v2/\${project_id}#clusters/detail/${awsResourceNames.atlasMongoCluster(name)}`,
          { project_id: Ref(cfLogicalNames.atlasMongoProject()) }
        )
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'connectionString',
        nameChain,
        paramValue: GetAtt(cfLogicalNames.atlasMongoCluster(name), 'SrvConnectionString'),
        showDuringPrint: true
      });
      if (definition.adminUserCredentials) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.atlasMongoClusterMasterUser(name),
          nameChain,
          resource: getAtlasMongoMasterUserResource({ stpResourceName: name, resource: definition })
        });
      }
    });
  }
};
