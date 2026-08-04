import { describe, expect, test } from 'bun:test';
import { validateEventBusIntegration } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/event-bus-integration';
import type { EventBusIntegrationProps } from '@stacktape/config/events';

const validate = (eventDetails: EventBusIntegrationProps, referencerType: 'function' | 'sqs-queue' = 'function') =>
  validateEventBusIntegration({
    eventDetails,
    referencerName: 'eventConsumer',
    referencerType
  });

const eventPattern = { source: ['characterization'] };

describe('shared EventBridge integration validation', () => {
  test('accepts the same valid target contract for Lambda and SQS consumers', () => {
    expect(() =>
      validate({
        eventBusName: 'applicationEvents',
        eventPattern,
        inputTransformer: {
          inputPathsMap: { id: '$.detail.id' },
          inputTemplate: { id: '<id>' }
        },
        onDeliveryFailure: { sqsQueueName: 'failedEvents' }
      })
    ).not.toThrow();
    expect(() =>
      validate(
        {
          useDefaultBus: true,
          eventPattern,
          inputPath: '$.detail',
          onDeliveryFailure: { sqsQueueArn: 'arn:aws:sqs:eu-west-1:123456789012:failed-events' }
        },
        'sqs-queue'
      )
    ).not.toThrow();
  });

  test('rejects competing target-input options with a stable code and remediation', () => {
    expect(() =>
      validate({
        useDefaultBus: true,
        eventPattern,
        input: { source: 'fixed' },
        inputPath: '$.detail'
      })
    ).toThrow(
      expect.objectContaining({
        code: 'EVENT_BUS_INPUT_OPTIONS_CONFLICT',
        hints: [expect.stringContaining('exactly one')]
      })
    );
  });

  test('requires exactly one event bus reference', () => {
    expect(() => validate({ eventBusName: 'events', eventBusArn: 'arn:duplicate', eventPattern })).toThrow(
      expect.objectContaining({ code: 'EVENT_BUS_REFERENCE_INVALID' })
    );
  });

  test('requires exactly one failure-queue reference', () => {
    expect(() =>
      validate({
        useDefaultBus: true,
        eventPattern,
        onDeliveryFailure: { sqsQueueName: 'failedEvents', sqsQueueArn: 'arn:duplicate' }
      })
    ).toThrow(expect.objectContaining({ code: 'EVENT_BUS_FAILURE_QUEUE_REFERENCE_INVALID' }));
  });
});
