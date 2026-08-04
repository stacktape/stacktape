import type { MarketingAnalyticsEventMap } from '@stacktape/analytics/events';
import posthog from 'posthog-js';

export const trackMarketingAnalyticsEvent = <TEvent extends keyof MarketingAnalyticsEventMap>(
  eventName: TEvent,
  properties: MarketingAnalyticsEventMap[TEvent]
) => posthog.capture(eventName, properties);
