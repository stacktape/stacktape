import { describe, expect, test } from 'bun:test';
import type { ConfigManager } from '../index';
import type { StpWebSocketApiGateway } from '../resolved-types/websocket-api-gateways';
import { getConnectToIncludingWebsocketApiGateways, validateWebsocketApiGatewayConfig } from './websocket-api-gateways';

const gateway = (overrides: Partial<StpWebSocketApiGateway> = {}): StpWebSocketApiGateway => ({
  type: 'websocket-api-gateway',
  name: 'realtime',
  nameChain: ['realtime'],
  configParentResourceType: 'websocket-api-gateway',
  routeSelectionExpression: '$request.body.action',
  ...overrides
});

const configWithEvents = (events: unknown[]): ConfigManager => {
  const functions = [
    { name: 'firstHandler', type: 'function', events: [events[0]] },
    ...(events[1] ? [{ name: 'secondHandler', type: 'function', events: [events[1]] }] : []),
    { name: 'authorizer', type: 'function', events: [] }
  ];
  return {
    functions,
    findResourceInConfig: ({ nameChain }: { nameChain: string[] }) => ({
      resource: functions.find(({ name }) => name === nameChain[0]),
      fullyResolved: true,
      restPath: [],
      validPath: nameChain
    })
  } as unknown as ConfigManager;
};

const event = (routeKey: string, authorizer?: { type: 'aws-iam' }, returnResponse?: boolean) => ({
  type: 'websocket-api-gateway' as const,
  properties: { websocketApiGatewayName: 'realtime', routeKey, authorizer, returnResponse }
});

describe('WebSocket API configuration validation', () => {
  test('derives automatic gateway connections only from WebSocket events', () => {
    expect(
      getConnectToIncludingWebsocketApiGateways({
        connectTo: ['jobs', 'realtime'],
        events: [event('$connect'), { type: 'schedule', properties: { rate: 'rate(1 hour)' } }, event('sendMessage')]
      })
    ).toEqual(['jobs', 'realtime']);
  });

  test('rejects duplicate route keys with both handler names', () => {
    expect(() =>
      validateWebsocketApiGatewayConfig({
        activeConfig: configWithEvents([event('sendMessage'), event('sendMessage')]),
        resource: gateway()
      })
    ).toThrow('routes `sendMessage` to both `firstHandler` and `secondHandler`');
  });

  test('allows authorization only on $connect', () => {
    expect(() =>
      validateWebsocketApiGatewayConfig({
        activeConfig: configWithEvents([event('sendMessage', { type: 'aws-iam' })]),
        resource: gateway()
      })
    ).toThrow('only on the `$connect` route');

    expect(() =>
      validateWebsocketApiGatewayConfig({
        activeConfig: configWithEvents([event('$connect', { type: 'aws-iam' })]),
        resource: gateway()
      })
    ).not.toThrow();
  });

  test('allows handler responses only on message routes', () => {
    for (const routeKey of ['$connect', '$disconnect']) {
      expect(() =>
        validateWebsocketApiGatewayConfig({
          activeConfig: configWithEvents([event(routeKey, undefined, true)]),
          resource: gateway()
        })
      ).toThrow('lifecycle routes cannot send a WebSocket message');
    }

    for (const routeKey of ['$default', 'getStatus']) {
      expect(() =>
        validateWebsocketApiGatewayConfig({
          activeConfig: configWithEvents([event(routeKey, undefined, true)]),
          resource: gateway()
        })
      ).not.toThrow();
    }
  });

  test('rejects unknown reserved and empty route keys', () => {
    for (const routeKey of ['', ' sendMessage ', '$unknown']) {
      expect(() =>
        validateWebsocketApiGatewayConfig({
          activeConfig: configWithEvents([event(routeKey)]),
          resource: gateway()
        })
      ).toThrow('invalid WebSocket route key');
    }
  });

  test('validates route selection and Lambda authorizer identity sources', () => {
    expect(() =>
      validateWebsocketApiGatewayConfig({
        activeConfig: configWithEvents([]),
        resource: gateway({ routeSelectionExpression: '  ' })
      })
    ).toThrow('empty `routeSelectionExpression`');

    const lambdaAuthorizerEvent = (identitySources: string[]) => ({
      type: 'websocket-api-gateway' as const,
      properties: {
        websocketApiGatewayName: 'realtime',
        routeKey: '$connect',
        authorizer: {
          type: 'lambda' as const,
          properties: { functionName: 'authorizer', identitySources }
        }
      }
    });

    expect(() =>
      validateWebsocketApiGatewayConfig({
        activeConfig: configWithEvents([lambdaAuthorizerEvent([])]),
        resource: gateway()
      })
    ).toThrow('empty authorizer `identitySources`');
    expect(() =>
      validateWebsocketApiGatewayConfig({
        activeConfig: configWithEvents([lambdaAuthorizerEvent(['$request.header.Authorization'])]),
        resource: gateway()
      })
    ).toThrow('invalid authorizer identity source');
  });
});
