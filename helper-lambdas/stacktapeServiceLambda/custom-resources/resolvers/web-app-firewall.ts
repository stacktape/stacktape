import type { CreateWebACLCommandInput, Rule as Wafv2Rule } from '@aws-sdk/client-wafv2';
import {
  CreateWebACLCommand,
  DeleteWebACLCommand,
  ListWebACLsCommand,
  Scope,
  UpdateWebACLCommand,
  WAFV2Client
} from '@aws-sdk/client-wafv2';

const DEFAULT_RULES: StpServiceCustomResourceFirewallProps['rules'] = [
  {
    type: 'managed-rule-group',
    properties: {
      name: 'AWSManagedRulesCommonRuleSet',
      vendorName: 'AWS',
      priority: 0
    }
  },
  {
    type: 'managed-rule-group',
    properties: {
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
      vendorName: 'AWS',
      priority: 1
    }
  }
];

export const webAppFirewall: ServiceLambdaResolver<StpServiceCustomResourceProperties['webAppFirewall']> = async (
  currentProps,
  previousProps,
  operation
) => {
  console.info(
    `Resolver webAppFirewall, event type: ${operation}\n` +
      `Properties: ${JSON.stringify(currentProps, null, 2)}\n` +
      `Previous properties: ${JSON.stringify(previousProps, null, 2)}\n`
  );

  const finalCurrentProps = currentProps;
  if (!currentProps.rules) {
    finalCurrentProps.rules = DEFAULT_RULES;
  }

  return webACLHandler[operation](finalCurrentProps);
};

const createWebACL = async (firewall: StpServiceCustomResourceFirewallProps) => {
  const client = new WAFV2Client({ region: firewall.scope === 'regional' ? process.env.AWS_REGION : 'us-east-1' });
  const { Summary } = await client.send(new CreateWebACLCommand(buildWebAclCommandInput(firewall)));
  return {
    data: { Arn: Summary?.ARN, Id: Summary?.Id },
    physicalResourceId: firewall.name
  };
};

const updateWebACL = async (firewall: StpServiceCustomResourceFirewallProps) => {
  const client = new WAFV2Client({ region: firewall.scope === 'regional' ? process.env.AWS_REGION : 'us-east-1' });
  const summary = await getSummary({ firewall, client });
  await client.send(
    new UpdateWebACLCommand({
      Id: summary.Id,
      LockToken: summary.LockToken,
      ...buildWebAclCommandInput(firewall)
    })
  );
  return {
    data: { Arn: summary.ARN, Id: summary.Id },
    physicalResourceId: firewall.name
  };
};

const deleteWebACL = async (firewall: StpServiceCustomResourceFirewallProps) => {
  const client = new WAFV2Client({ region: firewall.scope === 'regional' ? process.env.AWS_REGION : 'us-east-1' });
  const summary = await getSummary({ firewall, client });
  await client.send(
    new DeleteWebACLCommand({
      Id: summary.Id,
      LockToken: summary.LockToken,
      Name: firewall.name,
      Scope: firewall.scope === 'regional' ? Scope.REGIONAL : Scope.CLOUDFRONT
    })
  );
  return {
    data: { Arn: summary.ARN, Id: summary.Id },
    physicalResourceId: firewall.name
  };
};

const webACLHandler = {
  Create: createWebACL,
  Update: updateWebACL,
  Delete: deleteWebACL
};

const getSummary = async ({
  firewall,
  client
}: {
  firewall: StpServiceCustomResourceFirewallProps;
  client: WAFV2Client;
}) => {
  return (
    await client.send(
      new ListWebACLsCommand({ Scope: firewall.scope === 'regional' ? Scope.REGIONAL : Scope.CLOUDFRONT })
    )
  ).WebACLs.find((webACL) => webACL.Name === firewall.name);
};

const buildWebAclCommandInput = (firewall: StpServiceCustomResourceFirewallProps) => {
  const input: CreateWebACLCommandInput = {
    Name: firewall.name,
    Description: `${firewall.name} in ${process.env.STACK_NAME}`,
    Scope: firewall.scope === 'regional' ? Scope.REGIONAL : Scope.CLOUDFRONT,
    DefaultAction: { [firewall.defaultAction ?? 'Allow']: {} },
    VisibilityConfig: buildVisibilityConfigInput({
      firewallName: firewall.name,
      metricsEnabled: !firewall.disableMetrics,
      sampledRequestsEnabled: firewall.sampledRequestsEnabled ?? true
    })
  };
  if (firewall.captchaImmunityTime) {
    input.CaptchaConfig = {
      ImmunityTimeProperty: {
        ImmunityTime: firewall.captchaImmunityTime
      }
    };
  }
  if (firewall.challengeImmunityTime) {
    // @ts-expect-error - this can be removed once the @aws-sdk package is updated from "3.188.0" version
    input.ChallengeConfig = {
      ImmunityTimeProperty: {
        ImmunityTime: firewall.challengeImmunityTime
      }
    };
  }
  if (firewall.rules) {
    const rules = buildRulesInput(firewall);
    input.Rules = rules;
  }
  return input;
};

const buildRulesInput = (firewall: StpServiceCustomResourceFirewallProps) => {
  const rules = firewall.rules;
  const rulesOutput: Wafv2Rule[] = rules.map((rule) => {
    const result: Wafv2Rule = {
      Name: [rule.properties.name, rule.type].join('-'),
      Priority: Number(rule.properties.priority),
      VisibilityConfig: buildVisibilityConfigInput({
        firewallName: firewall.name,
        ruleName: rule.properties.name,
        sampledRequestsEnabled: rule.properties.sampledRequestsEnabled,
        metricsEnabled: !rule.properties.disableMetrics
      }),
      Statement: {}
    };
    switch (rule.type) {
      case 'managed-rule-group':
        result.Statement = {
          ManagedRuleGroupStatement: {
            Name: rule.properties.name,
            VendorName: rule.properties.vendorName
          }
        };
        result.OverrideAction = {
          [rule.properties.overrideAction || 'None']: {}
        };
        if (rule.properties.excludedRules) {
          result.Statement.ManagedRuleGroupStatement.ExcludedRules = rule.properties.excludedRules.map(
            (excludedRule) => {
              return {
                Name: excludedRule
              };
            }
          );
        }
        break;
      case 'custom-rule-group':
        result.Statement = {
          RuleGroupReferenceStatement: {
            ARN: rule.properties.arn
          }
        };
        if (rule.properties.overrideAction) {
          result.OverrideAction = {
            [rule.properties.overrideAction]: {}
          };
        }
        break;
      case 'rate-based-rule':
        result.Statement = {
          RateBasedStatement: {
            Limit: Number(rule.properties.limit),
            AggregateKeyType: rule.properties.aggregateBasedOn
          }
        };
        result.Action = {
          [rule.properties.action ?? 'Block']: {}
        };
        if (rule.properties.aggregateBasedOn === 'FORWARDED_IP') {
          if (!rule.properties.forwardedIPConfig) {
            result.Statement.RateBasedStatement.ForwardedIPConfig = {
              FallbackBehavior: 'NO_MATCH',
              HeaderName: 'X-Forwarded-For'
            };
          } else {
            result.Statement.RateBasedStatement.ForwardedIPConfig = {
              FallbackBehavior: rule.properties.forwardedIPConfig.fallbackBehavior,
              HeaderName: rule.properties.forwardedIPConfig.headerName
            };
          }
        }
        break;
    }
    return result;
  });
  return rulesOutput;
};

const buildVisibilityConfigInput = ({
  firewallName,
  ruleName,
  sampledRequestsEnabled = false,
  metricsEnabled = false
}: {
  firewallName: string;
  ruleName?: string;
  sampledRequestsEnabled?: boolean;
  metricsEnabled?: boolean;
}) => {
  return {
    SampledRequestsEnabled: Boolean(sampledRequestsEnabled),
    CloudWatchMetricsEnabled: Boolean(metricsEnabled),
    MetricName: [firewallName, ruleName].filter((x) => x).join('-')
  };
};
