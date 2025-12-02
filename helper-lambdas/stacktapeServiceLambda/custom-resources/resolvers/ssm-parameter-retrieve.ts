import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export const ssmParameterRetrieve: ServiceLambdaResolver<
  StpServiceCustomResourceProperties['ssmParameterRetrieve']
> = async (currentProps, _previousProps, _operation) => {
  const ssmClient = new SSMClient({ region: currentProps.region });
  const param = await ssmClient.send(
    new GetParameterCommand({ Name: currentProps.parameterName, WithDecryption: true })
  );
  if (currentProps.parseAsJson) {
    return { data: { ...JSON.parse(param.Parameter.Value) } };
  }
  return { data: { value: param.Parameter.Value } };
};
