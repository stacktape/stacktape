import { afterEach, describe, expect, test } from 'bun:test';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { tuiManager } from '@application-services/tui-manager';
import { AwsSdkManager } from '../../src/aws/sdk-manager';
import type { AwsSts } from '../../src/aws/identity';
import type { Pluggable } from '@aws-sdk/types';

type InitArguments = Parameters<AwsSdkManager['init']>[0];

const originalSend = STSClient.prototype.send;

const credentialsFor = (suffix: string) => ({
  accessKeyId: `AKIA${suffix}`,
  secretAccessKey: `secret-${suffix}`
});

const validStsCredentials = {
  AccessKeyId: 'AKIAASSUMED',
  SecretAccessKey: 'assumed-secret',
  Expiration: new Date('2026-01-01T00:00:00.000Z'),
  SessionToken: 'assumed-session-token'
};

/** Records what the manager was asked to do with a failure instead of throwing out of the test. */
const recordingErrorHandler = () => {
  const seen: { message: string; error: Error }[] = [];
  const getErrorHandlerFn = (message: string) => (error: Error) => {
    seen.push({ message, error });
    throw error;
  };
  return { seen, getErrorHandlerFn };
};

/**
 * `AwsSdkManager` is constructed and then initialized synchronously by every one of its producers. These pin that
 * lifecycle, its refreshable credential-provider contract, and the one boundary where a *successful* AWS response is
 * not trusted on its own: `AssumeRole`.
 *
 * Everything lives under one serial group because the only available seam is `STSClient.prototype.send`, which is
 * global to the process. Two things follow, and both are needed:
 *
 * - `describe.serial` states the intent, but on Bun 1.3.9 it does not by itself override `bun test --concurrent`;
 *   `test.serial` on each case does. Without them, a lifecycle test can restore the real method while another test's
 *   `pRetry` backoff is still pending, and the shared call log interleaves — that was reproducible.
 * - Restoration is ownership-based. A test that never stubbed does not put `originalSend` back, so it cannot undo a
 *   stub belonging to a case that is still running.
 *
 * No test can reach the network: `callAssumeRole` refuses to run unless this file installed the stub, so an AWS call
 * from an un-stubbed test fails in-process instead of dialing STS. `mock.module` is deliberately not used — it
 * applies process-wide and would affect suites this one has no business touching.
 */
describe.serial('AWS SDK manager', () => {
  let sendCalls: AssumeRoleCommand[] = [];
  let stubInstalledByThisTest = false;

  const stubStsSend = (respond: (callNumber: number) => Promise<unknown>) => {
    sendCalls = [];
    // `send` is heavily overloaded on the SDK client; this records the command and answers with the fixture instead of
    // dispatching it. The one cast is the assignment to that overload set, not a claim about any value under test.
    const stubbedSend = (command: AssumeRoleCommand) => {
      sendCalls.push(command);
      return respond(sendCalls.length);
    };
    STSClient.prototype.send = stubbedSend as unknown as typeof originalSend;
    stubInstalledByThisTest = true;
  };

  /** Every assumed-role call goes through here, so an un-stubbed one cannot silently become a real STS request. */
  const callAssumeRole = (manager: AwsSdkManager, args: Parameters<AwsSts['assumeRoleCredentials']>[0]) => {
    if (!stubInstalledByThisTest) {
      throw new Error('Refusing to call AssumeRole without a stubbed STSClient.prototype.send.');
    }
    return manager.sts.assumeRoleCredentials(args);
  };

  afterEach(() => {
    // Only ever restore a stub this test installed; a lifecycle-only case must not reinstate the real network method
    // on behalf of someone else.
    if (stubInstalledByThisTest) {
      STSClient.prototype.send = originalSend;
      stubInstalledByThisTest = false;
    }
    sendCalls = [];
  });

  const initializedManager = (overrides: Partial<InitArguments> = {}) => {
    const manager = new AwsSdkManager();
    manager.init({ credentials: credentialsFor('ONE'), region: 'eu-west-1', ...overrides });
    return manager;
  };

  describe('initialization lifecycle', () => {
    test.serial('reports a freshly constructed manager as not initialized', () => {
      const manager = new AwsSdkManager();

      // The type contract says `credentials` is present; `isInitialized` is how a caller asks whether that is true yet.
      expect(manager.isInitialized).toBe(false);
    });

    test.serial('normalizes credentials into a provider without copying the credential object', async () => {
      const credentials = credentialsFor('ONE');
      const plugins: Pluggable<any, any>[] = [];
      const { getErrorHandlerFn } = recordingErrorHandler();

      const manager = new AwsSdkManager();
      manager.init({ credentials, region: 'eu-west-1', plugins, getErrorHandlerFn, printer: tuiManager });

      expect(manager.isInitialized).toBe(true);
      expect(await manager.credentialsProvider()).toBe(credentials);
      expect(manager.region).toBe('eu-west-1');
      expect(manager.plugins).toBe(plugins);
      expect(manager.printer).toBe(tuiManager);
    });

    test.serial('resolves credentials from the supplied provider for every client request', async () => {
      let credentials = credentialsFor('ONE');
      const manager = new AwsSdkManager();
      manager.init({ credentials: () => credentials, region: 'eu-west-1' });

      credentials = credentialsFor('TWO');

      expect(await manager.credentialsProvider()).toBe(credentials);
    });

    test.serial('re-initializes in place, swapping the credential provider', async () => {
      const first = credentialsFor('ONE');
      const second = credentialsFor('TWO');
      const manager = new AwsSdkManager();

      manager.init({ credentials: first, region: 'eu-west-1' });
      const identity = manager;
      manager.init({ credentials: second, region: 'us-east-1' });

      expect(manager).toBe(identity);
      expect(await manager.credentialsProvider()).toBe(second);
      expect(manager.region).toBe('us-east-1');
    });

    test.serial('fails explicitly when an AWS operation runs before initialization', async () => {
      const manager = new AwsSdkManager();

      expect(() => manager.cloudFormation).toThrow('AWS SDK manager has not been initialized.');
    });

    test.serial('resets optional arguments omitted on re-initialization back to their defaults', () => {
      const explicitPlugins: Pluggable<any, any>[] = [];
      const manager = new AwsSdkManager();

      manager.init({
        credentials: credentialsFor('ONE'),
        region: 'eu-west-1',
        plugins: explicitPlugins,
        printer: tuiManager
      });
      expect(manager.plugins).toBe(explicitPlugins);
      expect(manager.printer).toBe(tuiManager);

      manager.init({ credentials: credentialsFor('TWO'), region: 'eu-west-1' });

      // Omitting them is a reset, not a merge: plugins fall back to the built-in pair and the printer is cleared.
      expect(manager.plugins).not.toBe(explicitPlugins);
      expect(manager.plugins).toHaveLength(2);
      expect(manager.printer).toBeUndefined();
    });

    test.serial('resets a custom error handler to the default on re-initialization', async () => {
      // The handler is the one omitted option whose reset is only observable through a failure, so it needs a failing
      // call rather than a field read.
      stubStsSend(async () => ({ Credentials: { ...validStsCredentials, SessionToken: undefined } }));
      const { seen, getErrorHandlerFn } = recordingErrorHandler();
      const manager = new AwsSdkManager();

      manager.init({ credentials: credentialsFor('ONE'), region: 'eu-west-1', getErrorHandlerFn });
      manager.init({ credentials: credentialsFor('TWO'), region: 'eu-west-1' });

      await expect(callAssumeRole(manager, { roleArn: 'arn:role', roleSessionName: 'session' })).rejects.toThrow(
        /incomplete set of credentials/
      );

      // The default handler rethrows, so the failure still surfaces — but through the default, not through the
      // handler the first initialization supplied.
      expect(seen).toHaveLength(0);
    });
  });

  describe('assumed-role credential contract', () => {
    test.serial('maps every field of a valid STS result and passes the request through unchanged', async () => {
      stubStsSend(async () => ({ Credentials: { ...validStsCredentials } }));
      const manager = initializedManager();

      const credentials = await callAssumeRole(manager, {
        roleArn: 'arn:aws:iam::123456789012:role/deployer',
        roleSessionName: 'stacktape-session',
        durationSeconds: 7200
      });

      expect(credentials).toEqual({
        accessKeyId: 'AKIAASSUMED',
        secretAccessKey: 'assumed-secret',
        expiration: new Date('2026-01-01T00:00:00.000Z'),
        sessionToken: 'assumed-session-token'
      });
      expect(sendCalls).toHaveLength(1);
      expect(sendCalls[0].input).toEqual({
        RoleArn: 'arn:aws:iam::123456789012:role/deployer',
        RoleSessionName: 'stacktape-session',
        DurationSeconds: 7200
      });
    });

    test.serial('routes a success carrying no credentials to the configured error handler', async () => {
      // Previously an absent `Credentials` produced an incidental TypeError instead of the manager's own failure path.
      stubStsSend(async () => ({}));
      const { seen, getErrorHandlerFn } = recordingErrorHandler();
      const manager = initializedManager({ getErrorHandlerFn });

      await expect(callAssumeRole(manager, { roleArn: 'arn:role', roleSessionName: 'session' })).rejects.toThrow(
        /incomplete set of credentials/
      );

      expect(seen).toHaveLength(1);
      expect(seen[0].message).toBe('Failed to get credentials for assumed role.');
    });

    const incompleteCases: [string, Record<string, unknown>][] = [
      ['no access key id', { ...validStsCredentials, AccessKeyId: undefined }],
      ['no secret access key', { ...validStsCredentials, SecretAccessKey: undefined }],
      ['no expiration', { ...validStsCredentials, Expiration: undefined }],
      ['no session token', { ...validStsCredentials, SessionToken: undefined }]
    ];

    for (const [description, credentials] of incompleteCases) {
      test.serial(`routes a success with ${description} to the configured error handler`, async () => {
        // All four matter: callers sign with the token and refresh on the expiration, so a partial set is not usable
        // even though AWS reported success.
        stubStsSend(async () => ({ Credentials: credentials }));
        const { seen, getErrorHandlerFn } = recordingErrorHandler();
        const manager = initializedManager({ getErrorHandlerFn });

        await expect(callAssumeRole(manager, { roleArn: 'arn:role', roleSessionName: 'session' })).rejects.toThrow(
          /incomplete set of credentials/
        );

        expect(seen).toHaveLength(1);
      });
    }

    test.serial('retries an incomplete response and accepts a later valid one', async () => {
      stubStsSend(async (callNumber) =>
        callNumber === 1
          ? { Credentials: { ...validStsCredentials, SessionToken: undefined } }
          : { Credentials: { ...validStsCredentials } }
      );
      const { seen, getErrorHandlerFn } = recordingErrorHandler();
      const manager = initializedManager({ getErrorHandlerFn });

      const credentials = await callAssumeRole(manager, {
        roleArn: 'arn:role',
        roleSessionName: 'session',
        retry: { count: 3, delaySeconds: 0 }
      });

      expect(sendCalls).toHaveLength(2);
      expect(credentials.sessionToken).toBe('assumed-session-token');
      // A recovered attempt is not a failure, so the handler is never reached.
      expect(seen).toHaveLength(0);
    });

    test.serial('reaches the error handler only once the retries are exhausted', async () => {
      stubStsSend(async () => ({ Credentials: { ...validStsCredentials, Expiration: undefined } }));
      const { seen, getErrorHandlerFn } = recordingErrorHandler();
      const manager = initializedManager({ getErrorHandlerFn });

      await expect(
        callAssumeRole(manager, {
          roleArn: 'arn:role',
          roleSessionName: 'session',
          retry: { count: 1, delaySeconds: 0 }
        })
      ).rejects.toThrow(/incomplete set of credentials/);

      // One initial attempt plus the retry, then the handler. A single retry shows that ordering; `pRetry` backs off
      // exponentially on its own, so each extra count costs seconds of wall clock for no extra evidence.
      expect(sendCalls).toHaveLength(2);
      expect(seen).toHaveLength(1);
    });

    test.serial('reaches the error handler only once the retries are exhausted for a rejected call', async () => {
      stubStsSend(async () => {
        throw new Error('AccessDenied');
      });
      const { seen, getErrorHandlerFn } = recordingErrorHandler();
      const manager = initializedManager({ getErrorHandlerFn });

      await expect(
        callAssumeRole(manager, {
          roleArn: 'arn:role',
          roleSessionName: 'session',
          retry: { count: 1, delaySeconds: 0 }
        })
      ).rejects.toThrow('AccessDenied');

      expect(sendCalls).toHaveLength(2);
      expect(seen).toHaveLength(1);
      expect(seen[0].error.message).toBe('AccessDenied');
    });

    test.serial('raises a short explicit duration to one hour and defaults an omitted one to twelve', async () => {
      stubStsSend(async () => ({ Credentials: { ...validStsCredentials } }));
      const manager = initializedManager();

      await callAssumeRole(manager, { roleArn: 'arn:role', roleSessionName: 'session', durationSeconds: 900 });
      await callAssumeRole(manager, { roleArn: 'arn:role', roleSessionName: 'session' });

      // Recorded as-is: raising a sub-hour duration is existing behavior this slice does not change.
      expect(sendCalls[0].input.DurationSeconds).toBe(60 * 60);
      expect(sendCalls[1].input.DurationSeconds).toBe(60 * 60 * 12);
    });

    test.serial('restores the real send implementation between tests', () => {
      // Guards the cleanup the rest of this file depends on, and that the wider suite depends on after it.
      expect(STSClient.prototype.send).toBe(originalSend);
    });
  });
});
