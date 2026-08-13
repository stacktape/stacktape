import { describe, expect, test } from 'bun:test';
import { WEBSOCKET_API_STAGE_NAME } from '@domain-services/config-manager/utils/websocket-api-gateways';
import { getWebsocketApiDefaultClientUrl, getWebsocketApiManagementEndpoint } from './utils';

describe('WebSocket API stable endpoint contract', () => {
  test('keeps the internal stage and generated endpoints stable', () => {
    expect(WEBSOCKET_API_STAGE_NAME).toBe('default');
    expect(getWebsocketApiDefaultClientUrl('realtime')).toEqual({
      'Fn::Join': ['', [{ 'Fn::GetAtt': ['RealtimeWebsocketApi', 'ApiEndpoint'] }, '/default']]
    });
    expect(getWebsocketApiManagementEndpoint('realtime')).toEqual({
      'Fn::Sub': [
        'https://${ApiId}.execute-api.${AWS::Region}.${AWS::URLSuffix}/default',
        { ApiId: { Ref: 'RealtimeWebsocketApi' } }
      ]
    });
  });
});
