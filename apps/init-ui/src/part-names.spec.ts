import { describe, expect, it } from 'bun:test';
import { createdList, partName } from './part-names';

const resource = (type: string, properties: Record<string, unknown> = {}) => ({ type, properties });

describe('partName', () => {
  it('names each resource the way a developer would', () => {
    expect(partName('app', resource('nextjs-web'))).toBe('Next.js site');
    expect(partName('mainDatabase', resource('relational-database', { engine: { type: 'postgres' } }))).toBe(
      'Postgres database'
    );
    expect(partName('db', resource('relational-database', { engine: { type: 'aurora-mysql-serverless-v2' } }))).toBe(
      'MySQL database'
    );
    expect(partName('databaseBastion', resource('bastion'))).toBe('database access server');
  });

  it('takes the framework from the scanned service with the same name', () => {
    const services = [
      { name: 'frontend', framework: 'react', language: 'javascript' },
      { name: 'backend', framework: 'fastapi', language: 'python' }
    ];
    expect(partName('frontend', resource('hosting-bucket'), services)).toBe('React site');
    expect(partName('backend', resource('web-service'), services)).toBe('FastAPI service');
    expect(partName('worker', resource('web-service'), services)).toBe('web service');
  });

  it('uses the only service when the names differ, and the language when the framework is unknown', () => {
    expect(
      partName('api', resource('web-service'), [{ name: 'go-clean-template', framework: 'unknown', language: 'go' }])
    ).toBe('Go service');
  });
});

describe('createdList', () => {
  const facts = {
    services: [
      { name: 'frontend', framework: 'react' },
      { name: 'backend', framework: 'fastapi' }
    ]
  } as never;

  it('lists what a deploy creates as a sentence, the app before its database', () => {
    expect(
      createdList(
        {
          mainDatabase: resource('relational-database', { engine: { type: 'postgres' } }),
          app: resource('nextjs-web')
        },
        {}
      )
    ).toBe('a Next.js site and a Postgres database');
    expect(
      createdList(
        {
          mainDatabase: resource('relational-database', { engine: { type: 'postgres' } }),
          databaseBastion: resource('bastion'),
          frontend: resource('hosting-bucket'),
          backend: resource('web-service')
        },
        { facts }
      )
    ).toBe('a React site, a FastAPI service, a Postgres database and a database access server');
  });

  it('counts two of a kind and keeps a long list short', () => {
    expect(createdList({ a: resource('worker-service'), b: resource('worker-service') }, {})).toBe(
      '2 background workers'
    );
    expect(createdList({ api: resource('http-api-gateway') }, {})).toBe('an HTTP API');
    expect(
      createdList(
        {
          a: resource('sqs-queue'),
          b: resource('bucket'),
          c: resource('event-bus'),
          d: resource('redis-cluster'),
          e: resource('dynamo-db-table')
        },
        {}
      )
    ).toBe('a DynamoDB table, a file storage bucket, a Redis cache and 2 more parts');
  });
});
