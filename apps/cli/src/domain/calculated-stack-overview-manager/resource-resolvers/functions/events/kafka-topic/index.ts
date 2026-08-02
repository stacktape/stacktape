import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import type { SourceAccessConfiguration } from '@cloudform/lambda/eventSourceMapping';
import { GetAtt, Ref } from '@cloudform/functions';
import EventSourceMapping from '@cloudform/lambda/eventSourceMapping';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import type { IntrinsicFunction } from '@stacktape/config/cloudformation';
import type { KafkaTopicIntegration, KafkaTopicIntegrationProps } from '@stacktape/config/events';
import type { StpIamRoleStatement } from '@stacktape/config/shared';
import { CliError } from '@utils/errors';

export const resolveKafkaTopicEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, cfLogicalName, aliasLogicalName, events, nameChain } = lambdaFunction;
  const eventInducedSecretsStatement = {
    Effect: 'Allow',
    Action: ['secretsmanager:GetSecretValue'],
    Resource: []
  };
  const lambdaEndpointArn = aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn');

  (events || []).forEach((event: KafkaTopicIntegration, index) => {
    if (event.type === 'kafka-topic') {
      const { customKafkaConfiguration } = event.properties;
      if (!customKafkaConfiguration) {
        throw new CliError({
          category: 'CONFIG_VALIDATION',
          code: 'CONFIG_KAFKA_SOURCE_REQUIRED',
          message: `Error in ${lambdaFunction.configParentResourceType} \`${name}\`. Kafka events require \`customKafkaConfiguration\`.`
        });
      }
      if (customKafkaConfiguration.authentication.type === 'MTLS') {
        eventInducedSecretsStatement.Resource.push(
          customKafkaConfiguration.authentication.properties.clientCertificate
        );

        if (customKafkaConfiguration.authentication.properties.serverRootCaCertificate) {
          eventInducedSecretsStatement.Resource.push(
            customKafkaConfiguration.authentication.properties.serverRootCaCertificate
          );
        }
      } else {
        eventInducedSecretsStatement.Resource.push(
          customKafkaConfiguration.authentication.properties.authenticationSecretArn
        );
      }
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.eventSourceMapping(name, index),
        nameChain,
        resource: getEventSourceMapping({ eventDetails: event.properties, lambdaEndpointArn })
      });
    }
  });

  return eventInducedSecretsStatement.Resource.length ? [eventInducedSecretsStatement] : [];
};

const getEventSourceMapping = ({
  lambdaEndpointArn,
  eventDetails
}: {
  eventDetails: KafkaTopicIntegrationProps;
  lambdaEndpointArn: string | IntrinsicFunction;
}) => {
  const accessConfigurations: SourceAccessConfiguration[] = [];
  if (eventDetails.customKafkaConfiguration.authentication.type === 'MTLS') {
    accessConfigurations.push({
      Type: 'CLIENT_CERTIFICATE_TLS_AUTH',
      URI: eventDetails.customKafkaConfiguration.authentication.properties.clientCertificate
    });
    if (eventDetails.customKafkaConfiguration.authentication.properties.serverRootCaCertificate) {
      accessConfigurations.push({
        Type: 'SERVER_ROOT_CA_CERTIFICATE',
        URI: eventDetails.customKafkaConfiguration.authentication.properties.serverRootCaCertificate
      });
    }
  } else {
    accessConfigurations.push({
      Type: eventDetails.customKafkaConfiguration.authentication.type,
      URI: eventDetails.customKafkaConfiguration.authentication.properties.authenticationSecretArn
    });
  }

  const resource = new EventSourceMapping({
    BatchSize: eventDetails.batchSize,
    MaximumBatchingWindowInSeconds: eventDetails.maxBatchWindowSeconds,
    Enabled: true,
    FunctionName: lambdaEndpointArn,
    SelfManagedEventSource: {
      Endpoints: {
        KafkaBootstrapServers: eventDetails.customKafkaConfiguration.bootstrapServers
      }
    },
    Topics: [eventDetails.customKafkaConfiguration.topicName],
    SourceAccessConfigurations: accessConfigurations
  });

  return resource;
};
