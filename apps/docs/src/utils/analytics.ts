declare global {
  interface Window {
    plausible?: (eventName: string, options?: { action?: string }) => void;
  }
}

/** Fire a Plausible custom event. The layout installs the queueing stub before the script loads. */
export const trackAnalyticsEvent = (eventName: string) => {
  window.plausible?.(eventName, { action: eventName });
};
