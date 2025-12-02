// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const trackAnalyticsEvent = (eventName: string, data: { source?: string; [prop: string]: any } = {}) => {
  (window as any).plausible(eventName, { action: eventName });
};
