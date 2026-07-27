import type { Environment, JobDefinitionProperties } from '@cloudform/batch/jobDefinition';
import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Ref } from '@cloudform/functions';
import { defaultLogRetentionDays } from '@config';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveConnectToList } from '@domain-services/config-manager/utils/resource-references';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { templateManager } from '@domain-services/template-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getJobName } from '@shared/naming/utils';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { getResolvedConnectToEnvironmentVariables } from '../_utils/connect-to-helper';
import { getResourcesNeededForLogForwarding } from '../_utils/log-forwarding';
import { getAtlasMongoRoleAssociatedUserResource } from '../_utils/role-helpers';
import { resolveFunction } from '../functions';
import {
  getBachJobLogGroup,
  getBatchComputeEnvironment,
  getBatchInstanceDefaultSecurityGroup,
  getBatchInstanceProfile,
  getBatchInstanceRole,
  getBatchJobDefinition,
  getBatchJobExecutionRole,
  getBatchJobQueue,
  getBatchServiceRole,
  getBatchSpotFleetRole,
  getBatchStateMachine,
  getBatchStateMachineExecutionRole,
  getIncreasedDiskSizeLaunchTemplate
} from './utils';

export const resolveBatchJobs = async () => {
  const { batchJobs } = configManager;
  const { stackName } = globalStateManager.targetStack;
  const {
    targetAwsAccount: { awsAccountId }
  } = globalStateManager;
  const { region } = globalStateManager;
  if (batchJobs.length) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.batchServiceRole(),
      resource: getBatchServiceRole(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.batchSpotFleetRole(),
      resource: getBatchSpotFleetRole(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.batchInstanceRole(),
      resource: getBatchInstanceRole(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.batchInstanceProfile(),
      resource: getBatchInstanceProfile(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.batchStateMachineExecutionRole(),
      resource: getBatchStateMachineExecutionRole(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.batchInstanceLaunchTemplate(),
      resource: getIncreasedDiskSizeLaunchTemplate(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.batchInstanceDefaultSecurityGroup(),
      resource: getBatchInstanceDefaultSecurityGroup(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
    if (batchJobs.some(({ resources: { gpu } }) => !gpu)) {
      // onDemand NON-gpu
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.batchComputeEnvironment(false, false),
        resource: getBatchComputeEnvironment({ gpu: false, spot: false }),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.batchJobQueue(false, false),
        resource: getBatchJobQueue({ gpu: false, spot: false }),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
      // spot NON-gpu
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.batchComputeEnvironment(true, false),
        resource: getBatchComputeEnvironment({ gpu: false, spot: true }),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.batchJobQueue(true, false),
        resource: getBatchJobQueue({ gpu: false, spot: true }),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
    }
    if (batchJobs.some(({ resources: { gpu } }) => gpu)) {
      // onDemand gpu
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.batchComputeEnvironment(false, true),
        resource: getBatchComputeEnvironment({ gpu: true, spot: false }),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.batchJobQueue(false, true),
        resource: getBatchJobQueue({ gpu: true, spot: false }),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
      // spot gpu
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.batchComputeEnvironment(true, true),
        resource: getBatchComputeEnvironment({ gpu: true, spot: true }),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.batchJobQueue(true, true),
        resource: getBatchJobQueue({ gpu: true, spot: true }),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
      });
    }
    // const {
    //   accessToResourcesPotentiallyRequiringSecurityGroupCreation:
    //     defaultsAccessToResourcesRequiringSecurityGroupCreation
    // } = resolveConnectToList({
    //   stpResourceNameOfReferencer: 'defaults.batchJobs',
    //   connectTo: /* configManager.workloadsDefaults?.batchJobs?.connectTo */ [],
    //   checkingDefaults: true
    // });
    batchJobs.forEach((definition) => {
      const {
        name,
        nameChain,
        _nestedResources: { triggerFunction }
      } = definition;

      resolveFunction({ lambdaProps: triggerFunction });

      const {
        accessToResourcesRequiringRoleChanges,
        // accessToResourcesPotentiallyRequiringSecurityGroupCreation,
        accessToAtlasMongoClusterResources,
        accessToAwsServices
      } = resolveConnectToList({
        stpResourceNameOfReferencer: name,
        connectTo: definition.connectTo
      });
      const batchJobDefinitionLogicalName = cfLogicalNames.batchJobDefinition(name);
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: batchJobDefinitionLogicalName,
        resource: getBatchJobDefinition({
          name,
          workload: definition
        }),
        nameChain
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        nameChain,
        paramName: 'jobDefinitionArn',
        paramValue: Ref(batchJobDefinitionLogicalName),
        showDuringPrint: true
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.batchStateMachine(name),
        resource: getBatchStateMachine(name, definition, stackName, region, awsAccountId),
        nameChain
      });
      calculatedStackOverviewManager.addStacktapeResourceLink({
        linkName: 'job-state-machine-executions',
        nameChain,
        linkValue: cfEvaluatedLinks.stateMachineExecutions(Ref(cfLogicalNames.batchStateMachine(name)))
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        nameChain,
        paramName: 'stateMachineArn',
        paramValue: Ref(cfLogicalNames.batchStateMachine(name)),
        showDuringPrint: true
      });
      if (!definition.logging?.disabled) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.batchJobLogGroup(name),
          resource: getBachJobLogGroup({
            workloadName: name,
            stackName,
            retentionDays: definition.logging?.retentionDays || defaultLogRetentionDays.batchJob
          }),
          nameChain
        });
        calculatedStackOverviewManager.addStacktapeResourceLink({
          linkName: 'logs',
          nameChain,
          linkValue: cfEvaluatedLinks.logGroup(
            awsResourceNames.batchJobLogGroup({
              stackName: globalStateManager.targetStack.stackName,
              stpResourceName: name
            })
          )
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          nameChain,
          paramName: 'logGroupArn',
          paramValue: GetAtt(cfLogicalNames.batchJobLogGroup(name), 'Arn'),
          showDuringPrint: true
        });
        if (definition.logging?.logForwarding) {
          getResourcesNeededForLogForwarding({
            resource: definition,
            logGroupCfLogicalName: cfLogicalNames.batchJobLogGroup(name),
            logForwardingConfig: definition.logging?.logForwarding
          }).forEach(({ cfLogicalName, cfResource }) => {
            if (!templateManager.getCfResourceFromTemplate(cfLogicalName)) {
              calculatedStackOverviewManager.addCfChildResource({
                nameChain,
                cfLogicalName,
                resource: cfResource
              });
            }
          });
        }
      }

      // creating deep copy of merged accessToResourcesPotentiallyRequiringSecurityGroupCreation from which we will delete ones defined in defaults
      // const resourceDefinedAccessToResourcesRequiringSecurityGroupCreation =
      //   accessToResourcesPotentiallyRequiringSecurityGroupCreation.slice();
      // // after this loop is finished resourceDefinedAccessToResourcesRequiringSecurityGroupCreation should only contain references that were defined for specific batch job
      // defaultsAccessToResourcesRequiringSecurityGroupCreation.forEach(({ name: defName }) => {
      //   const occurrence = resourceDefinedAccessToResourcesRequiringSecurityGroupCreation.findIndex(
      //     ({ name: resName }) => resName === defName
      //   );
      //   if (occurrence !== -1) {
      //     resourceDefinedAccessToResourcesRequiringSecurityGroupCreation.splice(occurrence, 1);
      //   }
      // });
      // if connectTo scopes resources that require securityGroup (on batch-job level) throw an error
      // you can scope these resources only in defaults.batchJobs.connectTo
      // if (resourceDefinedAccessToResourcesRequiringSecurityGroupCreation.length) {
      //   throw new ExpectedError(
      //     'CONFIG_VALIDATION',
      //     `Error in batch-job "${name}". Batch-job is referencing resources:\n${resourceDefinedAccessToResourcesRequiringSecurityGroupCreation.map(
      //       ({ name: refName, type: refType }) => `"${refName}" of type "${refType}"\n`
      //     )}which cannot be scoped by connectTo on per batchJob basis.`
      //   );
      // }
      const roleCfLogicalName = cfLogicalNames.batchJobExecutionRole(name);
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: roleCfLogicalName,
        resource: getBatchJobExecutionRole({
          workloadName: name,
          accessToResourcesRequiringRoleChanges,
          iamRoleStatements: definition.iamRoleStatements,
          accessToAwsServices
        }),
        nameChain
      });
      // here we are addressing creation of atlas mongo user which is associated to this role
      if (accessToAtlasMongoClusterResources?.length) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.atlasMongoUserAssociatedWithRole(name),
          nameChain,
          resource: getAtlasMongoRoleAssociatedUserResource({
            accessToAtlasMongoClusterResources,
            roleCfLogicalName
          })
        });
      }
      getJobDefinitionTemplateOverrideFns({ resource: definition }).forEach((fn) => {
        templateManager.addFinalTemplateOverrideFn(fn);
      });

      const resource = calculatedStackOverviewManager.getStpResource({ nameChain });
      resource.referencableParams = {
        ...resource.referencableParams,
        ...(resource._nestedResources?.triggerFunction?.referencableParams || {})
      };

      resource.links = {
        ...resource.links,
        ...(resource._nestedResources?.triggerFunction?.links || {})
      };
    });
  }
};

export const getJobDefinitionTemplateOverrideFns = ({
  resource,
  hotSwapDeploy
}: {
  resource: StpBatchJob;
  hotSwapDeploy?: boolean;
}): TemplateManager['templateOverrideFunctions'][number][] => {
  return [
    async (template) => {
      // @note we can't set this upfront, because it's known only after packaging is finished
      const imageUrl = deploymentArtifactManager.getImageUploadInfoForJob({
        jobName: getJobName({ workloadName: resource.name, workloadType: resource.type }),
        hotSwapDeploy
      })?.imageTagWithUrl;

      if (imageUrl) {
        template.Resources[cfLogicalNames.batchJobDefinition(resource.name)].Properties.ContainerProperties.Image =
          imageUrl;
      }
    },

    // @note we can't set this upfront, because the parameters are only known after entire template has been resolved
    async (template) => {
      const templateResourceProps = template.Resources[cfLogicalNames.batchJobDefinition(resource.name)]
        .Properties as JobDefinitionProperties;
      const currentVars = (templateResourceProps.ContainerProperties.Environment || []) as Environment[];

      const variablesToInject = getResolvedConnectToEnvironmentVariables({
        connectTo: resource.connectTo,
        localResolve: hotSwapDeploy
      });

      variablesToInject.forEach(({ Name, Value }) => {
        const varIndex = currentVars.findIndex(({ Name: AlreadyAddedName }) => Name === AlreadyAddedName);
        if (varIndex >= 0) {
          currentVars[varIndex] = { Name, Value };
        } else {
          currentVars.push({ Name, Value });
        }
      });
    }
  ];
};
