import {
  CreateTableCommand,
  DeleteItemCommand,
  DescribeTableCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand
} from '@aws-sdk/client-dynamodb';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ACCOUNT = '977946299200';
const REGION = 'eu-west-1';
const TABLE = 'stacktape-console-dev-coordination';
const RESERVATION_ENV = 'STP_CONSOLE_DEV_RESERVATION';
const awsOptions = {
  region: REGION,
  ignoreConfiguredEndpointUrls: true,
  maxAttempts: 3,
  requestHandler: { connectionTimeout: 3_000, requestTimeout: 10_000 }
};

type Reservation = { token: string; task: string; acquiredAt: string };
class ReservationError extends Error {}

const readToken = (token: string | undefined): string => {
  if (!token || !/^[0-9a-f-]{36}$/.test(token)) {
    throw new ReservationError(
      `Set ${RESERVATION_ENV} to your task's reservation ID. First run: pnpm console:dev:reservation acquire "task-label"`
    );
  }
  return token;
};

// A durable reservation, not an expiring lease: a dead process does not imply that its AWS operation stopped.
// Conditional writes also prevent a delayed release from deleting a later task's reservation.
export const consoleDevReservationStore = (client: DynamoDBClient, key = 'console-app-dev') => {
  const Key = { id: { S: key } };
  const status = async (): Promise<Reservation | undefined> => {
    const { Item } = await client.send(new GetItemCommand({ TableName: TABLE, Key, ConsistentRead: true }));
    if (!Item) return undefined;
    const token = Item.token?.S;
    const task = Item.task?.S;
    const acquiredAt = Item.acquiredAt?.S;
    if (!token || !task || !acquiredAt) throw new ReservationError('Invalid dev reservation record; investigate it.');
    return { token, task, acquiredAt };
  };
  const check = async (token: string | undefined) => {
    const expected = readToken(token);
    const current = await status();
    if (!current || current.token !== expected) {
      throw new ReservationError(
        current
          ? `Console dev is reserved by "${current.task}" since ${current.acquiredAt}.`
          : 'Console dev is not reserved.'
      );
    }
    return current;
  };
  return {
    status,
    check,
    acquire: async (task: string, token: string = randomUUID()): Promise<Reservation> => {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9 ._/-]{2,119}$/.test(task)) {
        throw new ReservationError('Use a 3–120 character task label containing letters, numbers, spaces, . _ / or -.');
      }
      readToken(token);
      const reservation = { token, task, acquiredAt: new Date().toISOString() };
      try {
        await client.send(
          new PutItemCommand({
            TableName: TABLE,
            Item: { ...Key, token: { S: token }, task: { S: task }, acquiredAt: { S: reservation.acquiredAt } },
            ConditionExpression: 'attribute_not_exists(id)'
          })
        );
      } catch (error) {
        // A response may have been lost after AWS accepted the write. Resolve the same attempt, never overwrite.
        const current = await status();
        if (current?.token === token) return current;
        if (current)
          throw new ReservationError(`Console dev is reserved by "${current.task}" since ${current.acquiredAt}.`);
        throw error;
      }
      return reservation;
    },
    release: async (token: string | undefined) => {
      const expected = readToken(token);
      await client.send(
        new DeleteItemCommand({
          TableName: TABLE,
          Key,
          ConditionExpression: '#token = :token',
          ExpressionAttributeNames: { '#token': 'token' },
          ExpressionAttributeValues: { ':token': { S: expected } }
        })
      );
      if ((await status())?.token === expected)
        throw new ReservationError('Dev reservation release could not be verified.');
    }
  };
};

export const connectConsoleDevReservation = async () => {
  const sts = new STSClient(awsOptions);
  try {
    const identity = await sts.send(new GetCallerIdentityCommand({}));
    if (identity.Account !== ACCOUNT)
      throw new ReservationError(`Console dev requires AWS account ${ACCOUNT} in ${REGION}.`);
  } finally {
    sts.destroy();
  }
  return new DynamoDBClient(awsOptions);
};

export const assertConsoleDevReservation = async () => {
  const token = readToken(process.env[RESERVATION_ENV]);
  const client = await connectConsoleDevReservation();
  try {
    await consoleDevReservationStore(client).check(token);
  } finally {
    client.destroy();
  }
};

const setup = async (client: DynamoDBClient) => {
  try {
    await client.send(
      new CreateTableCommand({
        TableName: TABLE,
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        BillingMode: 'PAY_PER_REQUEST',
        DeletionProtectionEnabled: true,
        Tags: [{ Key: 'stacktape-purpose', Value: 'console-dev-coordination' }]
      })
    );
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'ResourceInUseException') throw error;
  }
  const { Table } = await client.send(new DescribeTableCommand({ TableName: TABLE }));
  if (
    Table?.TableArn !== `arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/${TABLE}` ||
    Table.KeySchema?.length !== 1 ||
    Table.KeySchema[0]?.AttributeName !== 'id' ||
    Table.KeySchema[0]?.KeyType !== 'HASH' ||
    Table.AttributeDefinitions?.find(({ AttributeName }) => AttributeName === 'id')?.AttributeType !== 'S'
  )
    throw new ReservationError('The coordination table does not match its expected identity/schema.');
  console.info(
    `Coordination table: ${Table.TableStatus}. Retry acquisition once ACTIVE. No Console deployment is needed.`
  );
};

const main = async () => {
  const [command, task, ...extra] = process.argv.slice(2).filter((arg) => arg !== '--');
  if (
    !command ||
    !['setup', 'status', 'acquire', 'check', 'release'].includes(command) ||
    extra.length ||
    (command === 'acquire' ? !task : task)
  ) {
    throw new ReservationError('Usage: pnpm console:dev:reservation setup|status|acquire "task-label"|check|release');
  }
  if (command === 'check') return assertConsoleDevReservation();
  const client = await connectConsoleDevReservation();
  try {
    const store = consoleDevReservationStore(client);
    if (command === 'setup') return await setup(client);
    if (command === 'status') {
      const current = await store.status();
      console.info(current ? JSON.stringify(current) : 'Console dev is free.');
    } else if (command === 'acquire') {
      // Print before sending: even a terminated process leaves the caller its exact recovery ID.
      const token = randomUUID();
      console.info(`Reservation attempt ID (valid only after success): ${token}`);
      await store.acquire(task!, token);
      console.info(`Reserved Console dev for "${task}". Keep this reservation through testing and cleanup.`);
      console.info(`export ${RESERVATION_ENV}=${token}`);
      console.info(
        'Release only after all local processes and AWS operations have stopped: pnpm console:dev:reservation release'
      );
    } else {
      await store.release(process.env[RESERVATION_ENV]);
      console.info('Released only the matching dev reservation; no application or AWS test resources were deleted.');
    }
  } finally {
    client.destroy();
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(
      error instanceof ReservationError
        ? error.message
        : `Dev reservation failed (${error instanceof Error ? error.name : 'unknown error'}). Run status before retrying; do not bypass the reservation.`
    );
    process.exitCode = 1;
  });
}
