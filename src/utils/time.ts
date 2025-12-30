import { NtpTimeSync } from 'ntp-time-sync';
import { tuiManager } from './tui';

const synced = NtpTimeSync.getInstance({
  servers: ['time.aws.com'],
  sampleCount: 3,
  ntpDefaults: { minPoll: 17 }
});

export const getAwsSynchronizedTime = async () => {
  try {
    return synced.now();
  } catch (err) {
    console.error(`Unable to get time synced with AWS: ${err.message}.\n Using local time`);
    tuiManager.debug(`Unable to get time synced with AWS: ${err.message}.\n Using local time`);
    return new Date();
  }
};
