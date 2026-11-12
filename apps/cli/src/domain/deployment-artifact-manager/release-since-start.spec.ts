import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { globalStateManager } from '@application-services/global-state-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import type { StackDetails } from '@domain-services/cloudformation-stack-manager/types';
import { outputNames } from '@stacktape/naming/stack-output-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { deploymentArtifactManager as manager } from './index';

const stack = (version: string, status = 'UPDATE_COMPLETE') =>
  ({ StackStatus: status, stackOutput: { [outputNames.deploymentVersion()]: version } }) as unknown as StackDetails;

let current: StackDetails;
let markers: string[];
const spies: { mockRestore: () => void }[] = [];

beforeEach(() => {
  awsSdkManager.init({ credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, region: 'eu-west-1' });
  globalStateManager.targetStack = { ...globalStateManager.targetStack, stackName: 'app-prod' };
  manager.deploymentBucketName = 'deployment-bucket';
  // What the operation read when it started: the stack at v000003 and a fast release v000004.
  stackManager.existingStackDetails = stack('v000003');
  manager.previousObjects = [
    { name: 'fast-release', version: 'v000004', digest: null, type: 'fast-release', s3Key: 'fast-release/v000004.json' }
  ] as unknown as typeof manager.previousObjects;
  current = stack('v000003');
  markers = ['fast-release/v000004.json'];
  spies.push(
    spyOn(awsSdkManager.cloudFormation, 'getDetails').mockImplementation(async () => current),
    spyOn(awsSdkManager.s3, 'listObjects').mockImplementation(async () => markers.map((Key) => ({ Key })))
  );
});
afterEach(() => {
  spies.splice(0).forEach((spy) => spy.mockRestore());
});

const check = () =>
  manager.ensureNoReleaseSinceStart({ operation: 'deploy' }).then(
    () => undefined,
    (error: unknown) => error
  );

test('lets an operation continue when nothing changed the stack since it started', async () => {
  expect(await check()).toBeUndefined();
});

test('stops an operation after another fast deployment created a release', async () => {
  markers.push('fast-release/v000005.json');
  const error = await check();
  expect(error).toBeInstanceOf(ExpectedError);
  expect((error as Error).message).toContain(
    'Another operation changed stack app-prod while this deploy was preparing'
  );
});

test('stops an operation after a CloudFormation deployment or rollback created a release', async () => {
  current = stack('v000005');
  expect(await check()).toBeInstanceOf(ExpectedError);
});

test('stops an operation on a stack that is being deleted', async () => {
  current = stack('v000003', 'DELETE_IN_PROGRESS');
  expect(((await check()) as Error).message).toContain('is being deleted');
});

test('stops a first deploy when another deploy created the stack meanwhile', async () => {
  const error = await manager.ensureNoReleaseSinceStart({ operation: 'deploy', createsStack: true }).catch((e) => e);
  expect((error as Error).message).toContain('Another operation created stack app-prod');
});

test('lets a first deploy continue while the stack still does not exist', async () => {
  current = null as unknown as StackDetails;
  expect(await manager.ensureNoReleaseSinceStart({ operation: 'deploy', createsStack: true })).toBeUndefined();
});
