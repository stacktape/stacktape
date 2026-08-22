/**
 * The name-shape table that decides which resource parameter a variable is asking for.
 *
 * Every `param` this table can return must exist in the CLI's stack-overview resolvers — a wrong
 * parameter name here validates fine and fails at deploy time, which is the failure mode this
 * pipeline exists to prevent.
 */

import { describe, expect, it } from 'bun:test';
import { secretNameFor, wiringFor } from './env-wiring';

describe('wiringFor', () => {
  it('resolves the common shapes to their published parameters', () => {
    expect(wiringFor('postgres', 'DATABASE_URL')).toEqual({ kind: 'param', param: 'connectionString' });
    expect(wiringFor('postgres', 'POSTGRES_JDBC_URL')).toEqual({ kind: 'param', param: 'jdbcConnectionString' });
    expect(wiringFor('postgres', 'POSTGRES_DB')).toEqual({ kind: 'param', param: 'dbName' });
    expect(wiringFor('mysql', 'DB_HOST')).toEqual({ kind: 'param', param: 'host' });
    expect(wiringFor('redis', 'REDIS_PORT')).toEqual({ kind: 'param', param: 'port' });
    expect(wiringFor('mongodb', 'MONGODB_URI')).toEqual({ kind: 'param', param: 'connectionString' });
    expect(wiringFor('queue', 'SQS_QUEUE_URL')).toEqual({ kind: 'param', param: 'url' });
    expect(wiringFor('topic', 'SNS_TOPIC_ARN')).toEqual({ kind: 'param', param: 'arn' });
    expect(wiringFor('dynamodb', 'USERS_TABLE')).toEqual({ kind: 'param', param: 'name' });
    expect(wiringFor('object-storage', 'UPLOADS_BUCKET')).toEqual({ kind: 'param', param: 'name' });
    expect(wiringFor('search', 'OPENSEARCH_ENDPOINT')).toEqual({ kind: 'param', param: 'domainEndpoint' });
  });

  it('falls back to the primary handle for a shapeless name that provably addresses the dependency', () => {
    expect(wiringFor('postgres', 'MY_MAIN_DB_THING')).toEqual({ kind: 'param', param: 'connectionString' });
    expect(wiringFor('queue', 'JOBS')).toEqual({ kind: 'param', param: 'url' });
  });

  it('leaves unwirable shapes honestly unwired', () => {
    expect(wiringFor('postgres', 'POSTGRES_USER')).toEqual({ kind: 'none' });
    // A Redis database index is a number the app owns, not a value we can supply.
    expect(wiringFor('redis', 'REDIS_DB')).toEqual({ kind: 'none' });
    expect(wiringFor('redis', 'REDIS_PASSWORD')).toEqual({ kind: 'none' });
    expect(wiringFor('redis', 'REDIS_CLIENT')).toEqual({ kind: 'none' });
    expect(wiringFor('redis', 'REDIS_PREFIX')).toEqual({ kind: 'none' });
    expect(wiringFor('queue', 'QUEUE_CONNECTION')).toEqual({ kind: 'none' });
    expect(wiringFor('queue', 'SQS_SUFFIX')).toEqual({ kind: 'none' });
  });

  it('routes password shapes to the generated database secret, and only for databases', () => {
    expect(wiringFor('postgres', 'POSTGRES_PASSWORD')).toEqual({ kind: 'password-secret' });
    expect(wiringFor('mysql', 'MYSQL_PASSWD')).toEqual({ kind: 'password-secret' });
  });
});

describe('secretNameFor', () => {
  it('keeps ordinary names intact, lowercased', () => {
    expect(secretNameFor('STRIPE_SECRET_KEY')).toBe('stripe_secret_key');
  });

  it('strips everything that could escape a directive argument', () => {
    expect(secretNameFor("KEY'),('injected")).toBe('keyinjected');
    expect(secretNameFor("')(")).toBeUndefined();
  });
});
