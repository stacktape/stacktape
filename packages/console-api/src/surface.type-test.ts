import { createAnonymousClient, createAwsIdentityClient, createCliClient } from './index.js';

const endpoint = 'https://example.invalid/trpc';
const anonymous = createAnonymousClient({ endpoint });
const cli = createCliClient({ apiKey: 'type-test', endpoint });
const aws = createAwsIdentityClient({
  endpoint,
  getSignedIdentityHeader: async () => 'synthetic-signed-identity'
});

void anonymous.health.query();
void anonymous.estimatePrice.query({ units: 2 });
// @ts-expect-error Anonymous clients must not see API-key procedures.
void anonymous.cliProfile.query();
// @ts-expect-error Anonymous clients must not see AWS-identity procedures.
void anonymous.reportAlarm.mutate({ alarmName: 'test', state: 'OK' });

void cli.health.query();
void cli.cliProfile.query();
void cli.startDeployment.mutate({ project: 'demo', stage: 'dev' });
// @ts-expect-error CLI clients must not see AWS-identity procedures.
void cli.reportAlarm.mutate({ alarmName: 'test', state: 'OK' });
// @ts-expect-error CLI clients must not see private Console procedures.
void cli.privateProfile.query();

void aws.reportAlarm.mutate({ alarmName: 'test', state: 'ALARM' });
// @ts-expect-error AWS-identity clients must not see API-key procedures.
void aws.startDeployment.mutate({ project: 'demo', stage: 'dev' });
// @ts-expect-error AWS-identity clients must not see anonymous procedures.
void aws.health.query();
