import type { ServiceLambdaResolver } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import { Kafka, GetBootstrapBrokersCommand } from '@aws-sdk/client-kafka';

type KafkaClient = Pick<Kafka, 'send'>;

export const resolveKafkaBootstrapBrokers = async ({
  clusterArn,
  operation,
  client = new Kafka({})
}: {
  clusterArn: string;
  operation: 'Create' | 'Update' | 'Delete';
  client?: KafkaClient;
}) => {
  if (operation === 'Delete') {
    return { data: {}, physicalResourceId: clusterArn };
  }
  const response = await client.send(new GetBootstrapBrokersCommand({ ClusterArn: clusterArn }));
  if (!response.BootstrapBrokerStringSaslIam) {
    throw new Error(`Amazon MSK did not return IAM bootstrap brokers for cluster ${clusterArn}.`);
  }
  return {
    data: { BootstrapServers: response.BootstrapBrokerStringSaslIam },
    physicalResourceId: clusterArn
  };
};

export const kafkaBootstrapBrokers: ServiceLambdaResolver<
  StpServiceCustomResourceProperties['kafkaBootstrapBrokers']
> = async (currentProps, _previousProps, operation) =>
  resolveKafkaBootstrapBrokers({ clusterArn: currentProps.clusterArn as string, operation });
