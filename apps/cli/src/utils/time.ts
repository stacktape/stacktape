import { tuiManager } from '@application-services/tui-manager';

const HTTP_TIME_SYNC_TIMEOUT_MS = 5000;

const getTimeViaHttp = async (): Promise<Date> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HTTP_TIME_SYNC_TIMEOUT_MS);
  try {
    const response = await fetch('https://aws.amazon.com', {
      method: 'HEAD',
      signal: controller.signal
    });
    const dateHeader = response.headers.get('date');
    if (dateHeader) {
      return new Date(dateHeader);
    }
    throw new Error('No date header in response');
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getAwsSynchronizedTime = async (): Promise<Date> => {
  try {
    return await getTimeViaHttp();
  } catch (err) {
    tuiManager.debug(`Failed to sync time via HTTP: ${err.message}. Using local time.`);
    return new Date();
  }
};
