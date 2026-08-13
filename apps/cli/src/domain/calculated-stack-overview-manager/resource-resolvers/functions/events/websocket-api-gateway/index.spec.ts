import { describe, expect, test } from 'bun:test';
import {
  getWebsocketApiLambdaIntegration,
  getWebsocketApiLambdaPermission,
  getWebsocketApiRoute,
  getWebsocketApiRouteResponse
} from './index';

describe('WebSocket Lambda route synthesis', () => {
  test('uses the WebSocket Lambda proxy integration contract', () => {
    expect(
      getWebsocketApiLambdaIntegration({
        functionTimeout: 60,
        gatewayName: 'realtime',
        lambdaEndpointArn: { 'Fn::GetAtt': ['HandlerFunction', 'Arn'] },
        region: 'eu-west-1'
      })
    ).toEqual({
      Type: 'AWS::ApiGatewayV2::Integration',
      Properties: {
        ApiId: { Ref: 'RealtimeWebsocketApi' },
        IntegrationMethod: 'POST',
        IntegrationType: 'AWS_PROXY',
        IntegrationUri: {
          'Fn::Sub': [
            'arn:aws:apigateway:eu-west-1:lambda:path/2015-03-31/functions/${lambdaEndpointArn}/invocations',
            { lambdaEndpointArn: { 'Fn::GetAtt': ['HandlerFunction', 'Arn'] } }
          ]
        },
        TimeoutInMillis: 29000
      }
    });
  });

  test('authorizes only the configured connect route and targets the handler integration', () => {
    expect(
      getWebsocketApiRoute({
        event: {
          websocketApiGatewayName: 'realtime',
          routeKey: '$connect',
          authorizer: { type: 'aws-iam' }
        },
        gatewayName: 'realtime',
        workloadName: 'connectHandler'
      })
    ).toEqual({
      Type: 'AWS::ApiGatewayV2::Route',
      Properties: {
        ApiId: { Ref: 'RealtimeWebsocketApi' },
        AuthorizationType: 'AWS_IAM',
        RouteKey: '$connect',
        Target: {
          'Fn::Join': ['/', ['integrations', { Ref: 'ConnectHandlerRealtimeWebsocketIntegration' }]]
        }
      }
    });
  });

  test('limits API Gateway invocation to the managed API and stage', () => {
    expect(
      getWebsocketApiLambdaPermission({
        accountId: '123456789012',
        gatewayName: 'realtime',
        lambdaEndpointArn: { 'Fn::GetAtt': ['HandlerFunction', 'Arn'] },
        region: 'eu-west-1'
      })
    ).toEqual({
      Type: 'AWS::Lambda::Permission',
      Properties: {
        Action: 'lambda:InvokeFunction',
        FunctionName: { 'Fn::GetAtt': ['HandlerFunction', 'Arn'] },
        Principal: 'apigateway.amazonaws.com',
        SourceAccount: '123456789012',
        SourceArn: {
          'Fn::Join': [
            '',
            ['arn:aws:execute-api:eu-west-1:123456789012:', { Ref: 'RealtimeWebsocketApi' }, '/default/*']
          ]
        }
      }
    });
  });

  test('opts a route into returning the handler response to its caller', () => {
    expect(
      getWebsocketApiRoute({
        event: {
          websocketApiGatewayName: 'realtime',
          routeKey: 'getStatus',
          returnResponse: true
        },
        gatewayName: 'realtime',
        workloadName: 'statusHandler'
      }).Properties
    ).toMatchObject({
      RouteKey: 'getStatus',
      RouteResponseSelectionExpression: '$default'
    });
    expect(
      getWebsocketApiRouteResponse({
        gatewayName: 'realtime',
        routeLogicalName: 'StpRealtimeWebsocketGetStatusRoute'
      })
    ).toEqual({
      Type: 'AWS::ApiGatewayV2::RouteResponse',
      Properties: {
        ApiId: { Ref: 'RealtimeWebsocketApi' },
        RouteId: { Ref: 'StpRealtimeWebsocketGetStatusRoute' },
        RouteResponseKey: '$default'
      }
    });
  });
});
