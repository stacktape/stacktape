import LambdaPermission from '@cloudform/lambda/permission';
import cronValidate from 'aws-cron-validate';

export const getEventBusRuleLambdaPermission = ({
  lambdaEndpointArn,
  eventBusRuleArn
}: {
  lambdaEndpointArn: string | IntrinsicFunction;
  eventBusRuleArn: string | IntrinsicFunction;
}) => {
  return new LambdaPermission({
    Action: 'lambda:InvokeFunction',
    Principal: 'events.amazonaws.com',
    FunctionName: lambdaEndpointArn,
    SourceArn: eventBusRuleArn
  });
};

const filterInternalStringsFromMessage = (msg: string) => {
  return msg.replace(' when mustHaveBlankDayField option is enabled.', '');
};

export const validateScheduleSyntax = (input: string): string[] => {
  if (input.includes('rate(')) {
    return /^rate\((?:1 (?:minute|hour|day)|(?:1\d+|[2-9]\d*) (?:minute|hour|day)s)\)$/.test(input)
      ? null
      : ['Must be a valid rate syntax.'];
  }
  if (input.includes('cron(')) {
    try {
      return cronValidate(input.slice(5, -1)).getError().map(filterInternalStringsFromMessage);
    } catch {
      return null;
    }
  }
  return ['Must be either rate(<<FormInput>>) or cron(<<FormInput>>) syntax.'];
};
