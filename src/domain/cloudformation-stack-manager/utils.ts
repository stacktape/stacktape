import type { StackEvent } from '@aws-sdk/client-cloudformation';
import type { EcsServiceDeploymentStatusPoller } from '@shared/aws/ecs-deployment-monitoring';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { consoleLinks } from '@shared/naming/console-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getCloudformationChildResources } from '@shared/utils/stack-info-map';

export const cfFailedEventHandlers: {
  eventMatchFunction: (event: StackEvent) => boolean;
  handlerFunction: (
    event: StackEvent,
    additionalProps?: {
      ecsDeploymentStatusPollers?: { [serviceCfLogicalName: string]: EcsServiceDeploymentStatusPoller };
    }
  ) => Promise<{ errorMessage: string; hints?: string[] }>;
}[] = [
  {
    eventMatchFunction: (event) => {
      return event.ResourceStatusReason.includes(
        'Replacement type updates not supported on stack with disable-rollback.'
      );
    },
    handlerFunction: async (event) => {
      return {
        errorMessage: `Resource ${tuiManager.colorize('red', event.LogicalResourceId)} of type ${
          event.ResourceType
        } needs to be replaced. When automatic rollback is disabled, resource replacements during update are not allowed.`
      };
    }
  },
  // deletion of namespace
  {
    eventMatchFunction: (event) => {
      return (
        event.ResourceStatusReason.includes('Namespace has associated services') &&
        event.ResourceStatusReason.includes('delete the services before deleting the namespace') &&
        event.LogicalResourceId === cfLogicalNames.serviceDiscoveryPrivateNamespace()
      );
    },
    handlerFunction: async (event) => {
      return {
        errorMessage: `Failed to delete namespace ${tuiManager.colorize(
          'red',
          event.LogicalResourceId
        )}. This is a helper resource which helps private services to communicate within the stack. In some cases, AWS fails to detect(due to eventual consistency) that the namespace is not in use anymore and refuses to delete it.`,
        hints: [
          `Try running the command ${tuiManager.prettyCommand(globalStateManager.command)} again in a few minutes`
        ]
      };
    }
  },
  // deletion of database option group
  {
    eventMatchFunction: (event) => {
      return (
        event.ResourceStatusReason.includes('The option group') &&
        event.ResourceStatusReason.includes('cannot be deleted')
      );
    },
    handlerFunction: async (event) => {
      return {
        errorMessage: `Deletion of relational-database option group resource ${tuiManager.colorize(
          'red',
          event.LogicalResourceId
        )} failed. This can happen if there are manual snapshots of your database (associated with this option group) or AWS did not manage to delete automated snapshots during "${
          globalStateManager.command
        }" operation.`,
        hints: [
          `If you made manual snapshots of the database, delete them first and then re-run ${tuiManager.prettyCommand(
            globalStateManager.command
          )} command.`,
          `If you did not make manual snapshots of the database, simply re-run ${tuiManager.prettyCommand(
            globalStateManager.command
          )} command`
        ]
      };
    }
  },
  // update of stack cancelled by user
  {
    eventMatchFunction: (event) => {
      return (
        event.ResourceStatusReason.includes('User Initiated') &&
        event.LogicalResourceId === globalStateManager.targetStack.stackName
      );
    },
    handlerFunction: async (_event) => {
      return {
        errorMessage: 'Update of the stack was cancelled by the user.'
      };
    }
  },
  // lambda blue/green deployment failure
  {
    eventMatchFunction: (event) => {
      return (
        event.ResourceStatusReason.includes('Rollback successful') &&
        deployedStackOverviewManager.deployedFunctions.some(
          ({ nameChain }) =>
            event.LogicalResourceId in
            getCloudformationChildResources({
              resource: deployedStackOverviewManager.getStpResource({ nameChain })
            })
        )
      );
    },
    handlerFunction: async (event) => {
      const { nameChain: functionNameChain } = deployedStackOverviewManager.deployedFunctions.find(
        ({ nameChain }) =>
          event.LogicalResourceId in
          getCloudformationChildResources({
            resource: deployedStackOverviewManager.getStpResource({ nameChain })
          })
      );
      return {
        errorMessage: `Blue/green deployment of function ${tuiManager.colorize(
          'red',
          functionNameChain.join('.')
        )} failed.`
      };
    }
  },
  {
    eventMatchFunction: (event) => {
      return (
        (event.ResourceType === 'AWS::ECS::Service' && event.ResourceStatusReason.includes('Circuit Breaker')) ||
        (event.ResourceType === 'Stacktape::ECSBlueGreenV1::Service' &&
          event.ResourceStatusReason.includes('deployment timed out'))
      );
    },
    handlerFunction: async (event, additionalProps) => {
      const parentResourceName = calculatedStackOverviewManager.findStpParentNameOfCfResource({
        cfLogicalName: event.LogicalResourceId
      });
      const poller = additionalProps?.ecsDeploymentStatusPollers?.[event.LogicalResourceId];
      const failureDetails = poller?.getFailureMessage();

      // Build a clean error message
      const resourceLabel = parentResourceName || event.LogicalResourceId;
      const baseMessage = `Service ${tuiManager.colorize('red', resourceLabel)} failed to start`;

      return {
        errorMessage: failureDetails ? `${baseMessage}\n\n${failureDetails}` : `${baseMessage}: ${event.ResourceStatusReason}`
      };
    }
  },
  // quota error
  {
    eventMatchFunction: (event) => {
      return (
        event.ResourceStatusReason.includes('The maximum number') &&
        event.ResourceStatusReason.includes('has been reached')
      );
    },
    handlerFunction: async (event) => {
      const parentResourceName = calculatedStackOverviewManager.findStpParentNameOfCfResource({
        cfLogicalName: event.LogicalResourceId
      });
      const cleanedMessageStart = event.ResourceStatusReason.indexOf('The maximum number');
      const cleanedMessageEnd = event.ResourceStatusReason.indexOf('has been reached') + 'has been reached.'.length;
      const cleanedMessage = event.ResourceStatusReason.slice(cleanedMessageStart, cleanedMessageEnd);
      return {
        errorMessage: `Resource ${tuiManager.colorize('red', event.LogicalResourceId)}${
          parentResourceName ? ` (part of ${tuiManager.colorize('red', parentResourceName)})` : ''
        }: ${cleanedMessage}`,
        hints: [
          'You seem to have gotten AWS quota error. You can ask for quota increase in AWS console: https://console.aws.amazon.com/servicequotas/home/services'
        ]
      };
    }
  },
  // default behaviour, must be last
  {
    eventMatchFunction: () => {
      return true;
    },
    handlerFunction: async (event) => {
      const parentResourceName = calculatedStackOverviewManager.findStpParentNameOfCfResource({
        cfLogicalName: event.LogicalResourceId
      });

      // Clean up AWS error messages by removing internal metadata
      let cleanedReason = event.ResourceStatusReason;
      // Remove (RequestToken: ..., HandlerErrorCode: ...) pattern first
      cleanedReason = cleanedReason.replace(/\s*\(RequestToken:[^,]+,\s*HandlerErrorCode:[^)]+\)/gi, '');
      // Remove standalone (RequestToken: ...) pattern
      cleanedReason = cleanedReason.replace(/\s*\(RequestToken:[^)]+\)/gi, '');
      // Remove standalone (HandlerErrorCode: ...) pattern
      cleanedReason = cleanedReason.replace(/\s*\(HandlerErrorCode:[^)]+\)/gi, '');
      // Remove "Resource handler returned message: " prefix and extract the quoted message
      const handlerMatch = cleanedReason.match(/^Resource handler returned message:\s*"([\s\S]+)"\.?\s*$/);
      if (handlerMatch) {
        cleanedReason = handlerMatch[1];
      }
      // Remove AWS SDK details like (Service: Lambda, Status Code: 404, Request ID: ..., SDK Attempt Count: 1)
      cleanedReason = cleanedReason.replace(/\s*\(Service:[^,]+,\s*Status Code:\s*\d+,\s*Request ID:[^,]+,\s*SDK Attempt Count:\s*\d+\)/gi, '');
      // Remove separate (Service: ...) pattern
      cleanedReason = cleanedReason.replace(/\s*\(Service:[^)]+\)/gi, '');
      // Remove separate (SDK Attempt Count: ...) pattern
      cleanedReason = cleanedReason.replace(/\s*\(SDK Attempt Count:\s*\d+\)/gi, '');
      // Clean up any double spaces that might result
      cleanedReason = cleanedReason.replace(/\s{2,}/g, ' ').trim();

      return {
        errorMessage: `Resource ${tuiManager.colorize('red', event.LogicalResourceId)}${
          parentResourceName ? ` (part of ${tuiManager.colorize('red', parentResourceName)})` : ''
        }: ${cleanedReason}`
      };
    }
  }
];

export const getHintsAfterStackFailureOperation = ({
  cfStackAction,
  stackId,
  isAutoRollbackEnabled
}: {
  cfStackAction: 'create' | 'update' | 'delete' | 'rollback';
  stackId: string;
  isAutoRollbackEnabled: boolean;
}) => {
  if (cfStackAction === 'update') {
    return isAutoRollbackEnabled
      ? [
          `You can monitor stack rollback progress at ${consoleLinks.stackUrl(
            globalStateManager.region,
            stackId,
            'events'
          )}.`,
          `You can disable automatic rollback after error using the ${tuiManager.prettyOption(
            'disableAutoRollback'
          )} switch.`
        ]
      : [
          `Automatic rollback is disabled. You can manually rollback your stack using the ${tuiManager.colorize(
            'blue',
            'stacktape rollback'
          )} command.`
        ];
  }
  if (cfStackAction === 'create') {
    return [
      isAutoRollbackEnabled
        ? `Stack will be deleted. You can monitor the deletion progress at ${consoleLinks.stackUrl(
            globalStateManager.region,
            stackId,
            'events'
          )}.`
        : `Automatic rollback is disabled. You can manually rollback your stack using the ${tuiManager.colorize(
            'blue',
            'stacktape rollback'
          )} command.`
    ];
  }
  if (cfStackAction === 'delete') {
    return ['If some of the resources failed to delete, you can delete them manually in the AWS console.'];
  }
  return [];
};
