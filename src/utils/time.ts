import { NtpTimeSync } from 'ntp-time-sync';
import { printer } from './printer';

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
    printer.debug(`Unable to get time synced with AWS: ${err.message}.\n Using local time`);
    return new Date();
  }
};
