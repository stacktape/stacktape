import { getAtt } from '@stacktape/cloudformation/intrinsics';

import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@domain-services/calculated-stack-overview-manager/cloudformation-links';
import { consoleLinks } from '@stacktape/naming/console-links';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { ExpectedError } from '@utils/errors';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

export const resolveWebAppFirewalls = () => {
  configManager.webAppFirewalls.forEach((definition) => {
    const { scope } = definition;
    // The authored definition may omit its whole `properties` bag, and `scope` decides both the AWS API the firewall
    // is created against and the resources it can protect, so there is no defensible default to fall back on.
    if (!scope) {
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Web app firewall ${definition.name} is missing "scope".`,
        'Set properties.scope to "cdn" for CloudFront-attached resources or "regional" for load balancers, user pools and direct API gateways.'
      );
    }
    const currentScope = deployedStackOverviewManager.getStpResourceReferenceableParameter({
      nameChain: definition.name,
      referencableParamName: 'scope'
    });
    if (currentScope && currentScope !== scope) {
      throw stpErrors.e1005({ firewallName: definition.name });
    }

    const wafAwsResourceName = awsResourceNames.wafWebACLName(
      definition.name,
      calculatedStackOverviewManager.context.stackName,
      calculatedStackOverviewManager.context.globallyUniqueStackHash
    );

    calculatedStackOverviewManager.addCfChildResource({
      resource: getStpServiceCustomResource<'webAppFirewall'>({
        // `scope` is respread from the guarded local so the custom resource carries the value the guard proved.
        webAppFirewall: { ...definition, scope, name: wafAwsResourceName }
      }),
      cfLogicalName: cfLogicalNames.webAppFirewallCustomResource(definition.name),
      nameChain: definition.nameChain
    });

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: definition.nameChain,
      paramName: 'arn',
      paramValue: getAtt(cfLogicalNames.webAppFirewallCustomResource(definition.name), 'Arn')
    });

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: definition.nameChain,
      paramName: 'scope',
      paramValue: scope
    });

    calculatedStackOverviewManager.addStacktapeResourceLink({
      nameChain: definition.nameChain,
      linkName: 'console',
      linkValue: cfEvaluatedLinks.firewall({
        region: scope === 'cdn' ? 'global' : calculatedStackOverviewManager.context.region,
        awsWebACLName: wafAwsResourceName,
        awsWebACLId: getAtt(cfLogicalNames.webAppFirewallCustomResource(definition.name), 'Id')
      })
    });

    if (definition.rules && definition.rules.some((rule) => !rule.properties.disableMetrics)) {
      calculatedStackOverviewManager.addStacktapeResourceLink({
        nameChain: definition.nameChain,
        linkName: 'metrics',
        linkValue: consoleLinks.firewallMetrics({
          region: scope === 'cdn' ? 'us-east-1' : calculatedStackOverviewManager.context.region
        })
      });
    }
  });
};
