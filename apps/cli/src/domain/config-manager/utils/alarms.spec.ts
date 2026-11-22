import type { StpResource } from '@domain-services/config-manager/resolved-types/resources';
import type { AlarmDefinition } from '@stacktape/config/alarms';
import { describe, expect, test } from 'bun:test';
import { getAlarmsToBeAppliedToResource } from './alarms';

const legacyRule = {
  name: 'api-error-rate',
  forServices: ['*'],
  forStages: ['*'],
  trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 5 } }
} as unknown as AlarmDefinition;

const apiFunction = (props: { disabledGlobalAlarms?: string[] }) =>
  ({
    type: 'function',
    name: 'api',
    nameChain: ['api'],
    alarms: [
      {
        trigger: {
          type: 'lambda-error-rate',
          properties: { thresholdPercent: 5 }
        }
      }
    ],
    ...props
  }) as unknown as StpResource;

describe('getAlarmsToBeAppliedToResource', () => {
  test('applies an organization-wide rule next to the alarms in the config', () => {
    const alarms = getAlarmsToBeAppliedToResource({
      resource: apiFunction({}),
      globalAlarms: [legacyRule]
    });
    expect(alarms.map(({ nameChain }) => nameChain.join('.'))).toEqual(['api.alarms.api-error-rate', 'api.alarms.0']);
  });

  test('disabledGlobalAlarms excludes an organization-wide rule by its Console name', () => {
    const alarms = getAlarmsToBeAppliedToResource({
      resource: apiFunction({ disabledGlobalAlarms: ['api-error-rate'] }),
      globalAlarms: [legacyRule]
    });
    expect(alarms.map(({ nameChain }) => nameChain.join('.'))).toEqual(['api.alarms.0']);
  });

  test('skips rules whose trigger does not fit the resource type', () => {
    const queueRule = {
      ...legacyRule,
      name: 'queue-backlog',
      trigger: { type: 'sqs-queue-not-empty', properties: {} }
    } as unknown as AlarmDefinition;
    const alarms = getAlarmsToBeAppliedToResource({
      resource: apiFunction({}),
      globalAlarms: [queueRule]
    });
    expect(alarms.map(({ nameChain }) => nameChain.join('.'))).toEqual(['api.alarms.0']);
  });
});
