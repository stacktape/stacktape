import { IS_DEV, IS_TELEMETRY_DISABLED, SENTRY_CAPTURE_EXCEPTION_WAIT_TIME_MS, SENTRY_DSN } from '@config';
import { captureException, init, rewriteFramesIntegration, setTags } from '@sentry/bun';
import { wait } from '@shared/utils/misc';
import stripAnsi from 'strip-ansi';
import { getStacktapeVersion } from './versioning';

export const initializeSentry = () => {
  if (IS_DEV || IS_TELEMETRY_DISABLED) {
    return;
  }

  init({
    dsn: SENTRY_DSN,
    integrations: [rewriteFramesIntegration({ root: globalThis.__rootdir__ })],
    release: getStacktapeVersion(),
    maxValueLength: 10000,
    beforeBreadcrumb: (breadcrumb) => {
      breadcrumb.message = stripAnsi(breadcrumb.message);
      return breadcrumb;
    }
  });
};

export const setSentryTags = ({ invocationId, command }: { invocationId: string; command: StacktapeCommand }) => {
  if (IS_DEV || IS_TELEMETRY_DISABLED) {
    return;
  }

  setTags({ invocationId, command, osPlatform: process.platform });
};

export const reportErrorToSentry = async (error: ExpectedError | UnexpectedError) => {
  if (IS_DEV || IS_TELEMETRY_DISABLED) {
    return null;
  }

  const eventId = captureException(error);

  await wait(SENTRY_CAPTURE_EXCEPTION_WAIT_TIME_MS);

  return eventId;
};
