import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { filterResourcesForDevMode } from '../../../../commands/dev/dev-resource-filter';
import { getStpServiceCustomResource } from '../_utils/custom-resource';
import { getOpenSearchDomainLogGroup, getOpenSearchDomainResource, getOpenSearchDomainSecurityGroup } from './utils';

export const resolveOpenSearchDomains = () => {
  const openSearchDomains = filterResourcesForDevMode(configManager.openSearchDomains);
  openSearchDomains.forEach((openSearchDomain) => {
    const cfLogicalName = cfLogicalNames.openSearchDomain(openSearchDomain.name);

    const logging = openSearchDomain.logging ?? {};
    const finalLoggingConfig = {
      errorLogs: {
        disabled: logging.errorLogs?.disabled ?? false,
        retentionDays: logging.errorLogs?.retentionDays ?? 30
      },
      searchSlowLogs: {
        disabled: logging.searchSlowLogs?.disabled ?? false,
        retentionDays: logging.searchSlowLogs?.retentionDays ?? 5
      },
      indexSlowLogs: {
        disabled: logging.indexSlowLogs?.disabled ?? false,
        retentionDays: logging.indexSlowLogs?.retentionDays ?? 5
      }
    };
    calculatedStackOverviewManager.addCfChildResource({
      nameChain: openSearchDomain.nameChain,
      cfLogicalName,
      resource: {
        ...getOpenSearchDomainResource({
          resource: {
            ...openSearchDomain,
            logging: finalLoggingConfig
            // name: awsResourceNames.openSearchDomainName(openSearchDomain.name, globalStateManager.targetStack.stackName)
          }
        }),
        DependsOn: [cfLogicalNames.openSearchCustomResource(openSearchDomain.name)]
      }
    });

    // add security group if we are adding domain into VPC
    if (
      openSearchDomain.accessibility?.accessibilityMode === 'vpc' ||
      openSearchDomain.accessibility?.accessibilityMode === 'scoping-workloads-in-vpc'
    ) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.openSearchSecurityGroup(openSearchDomain.name),
        nameChain: openSearchDomain.nameChain,
        resource: getOpenSearchDomainSecurityGroup({ resource: openSearchDomain })
      });
    }

    // if any logging is enabled
    if (Object.values(finalLoggingConfig).some(({ disabled }) => !disabled)) {
      // create log groups for all enabled types of logging
      Object.entries(finalLoggingConfig).forEach(([logType, loggingConfig]) => {
        if (!loggingConfig.disabled) {
          calculatedStackOverviewManager.addCfChildResource({
            cfLogicalName: cfLogicalNames.openSearchDomainLogGroup(openSearchDomain.name, logType),
            nameChain: openSearchDomain.nameChain,
            resource: getOpenSearchDomainLogGroup({
              domainName: openSearchDomain.name,
              logGroupType: logType,
              retentionDays: loggingConfig.retentionDays,
              region: globalStateManager.region,
              stackName: globalStateManager.targetStack.stackName
            })
          });
        }
      });

      // custom resource for handling logs resource policy
      // ATM there could be only one custom resource for all opensearch domains
      // however in the future the custom resource might do more than creating resource policy
      calculatedStackOverviewManager.addCfChildResource({
        resource: getStpServiceCustomResource<'openSearch'>({
          openSearch: { ...openSearchDomain, name: openSearchDomain.name }
        }),
        cfLogicalName: cfLogicalNames.openSearchCustomResource(openSearchDomain.name),
        nameChain: openSearchDomain.nameChain
      });
    }

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: openSearchDomain.nameChain,
      paramName: 'domainEndpoint',
      paramValue: GetAtt(cfLogicalName, 'DomainEndpoint'),
      showDuringPrint: true
    });

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: openSearchDomain.nameChain,
      paramName: 'arn',
      paramValue: GetAtt(cfLogicalName, 'Arn'),
      showDuringPrint: true
    });
  });
};
