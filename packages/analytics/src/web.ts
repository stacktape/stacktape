import { getCommonEventProperties, type AnalyticsApp } from './events';
import { POSTHOG_UI_HOST } from './posthog';
import { sanitizeExceptionTelemetryValue, sanitizeTelemetryValue } from './privacy';

type CapturedWebEvent = {
  event?: string;
  properties?: Record<string, unknown>;
};

export const getCookielessPostHogConfig = ({
  apiHost,
  app,
  capturePageview,
  environment
}: {
  apiHost: string;
  app: AnalyticsApp;
  capturePageview: boolean | 'history_change';
  environment: string;
}) => ({
  api_host: apiHost,
  ui_host: POSTHOG_UI_HOST,
  defaults: '2026-05-30' as const,
  person_profiles: 'never' as const,
  cookieless_mode: 'always' as const,
  persistence: 'memory' as const,
  autocapture: false,
  capture_pageview: capturePageview,
  capture_pageleave: true,
  capture_exceptions: true,
  disable_session_recording: true,
  before_send: <Event extends CapturedWebEvent>(event: Event | null): Event | null => {
    if (!event) return null;
    return {
      ...event,
      properties: (event.event === '$exception' ? sanitizeExceptionTelemetryValue : sanitizeTelemetryValue)(
        event.properties
      ) as Event['properties']
    };
  },
  loaded: (client: { register: (properties: Record<string, unknown>) => void }) => {
    client.register(getCommonEventProperties({ app, environment }));
  }
});
