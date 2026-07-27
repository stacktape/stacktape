import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { consoleLinks } from '@shared/naming/console-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

export const resolveWebAppFirewalls = () => {
  configManager.webAppFirewalls.forEach((definition) => {
    const currentScope = deployedStackOverviewManager.getStpResourceReferenceableParameter({
      nameChain: definition.name,
      referencableParamName: 'scope'
    });
    if (currentScope && currentScope !== definition.scope) {
      throw stpErrors.e1005({ firewallName: definition.name });
    }

    const wafAwsResourceName = awsResourceNames.wafWebACLName(
      definition.name,
      globalStateManager.targetStack.stackName,
      globalStateManager.targetStack.globallyUniqueStackHash
    );

    calculatedStackOverviewManager.addCfChildResource({
      resource: getStpServiceCustomResource<'webAppFirewall'>({
        webAppFirewall: { ...definition, name: wafAwsResourceName }
      }),
      cfLogicalName: cfLogicalNames.webAppFirewallCustomResource(definition.name),
      nameChain: definition.nameChain
    });

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: definition.nameChain,
      paramName: 'arn',
      paramValue: GetAtt(cfLogicalNames.webAppFirewallCustomResource(definition.name), 'Arn')
    });

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: definition.nameChain,
      paramName: 'scope',
      paramValue: definition.scope
    });

    calculatedStackOverviewManager.addStacktapeResourceLink({
      nameChain: definition.nameChain,
      linkName: 'console',
      linkValue: cfEvaluatedLinks.firewall({
        region: definition.scope === 'cdn' ? 'global' : globalStateManager.region,
        awsWebACLName: wafAwsResourceName,
        awsWebACLId: GetAtt(cfLogicalNames.webAppFirewallCustomResource(definition.name), 'Id')
      })
    });

    if (definition.rules && definition.rules.some((rule) => !rule.properties.disableMetrics)) {
      calculatedStackOverviewManager.addStacktapeResourceLink({
        nameChain: definition.nameChain,
        linkName: 'metrics',
        linkValue: consoleLinks.firewallMetrics({
          region: definition.scope === 'cdn' ? 'us-east-1' : globalStateManager.region
        })
      });
    }
  });
};
