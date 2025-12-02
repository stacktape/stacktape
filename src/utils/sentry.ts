import { IS_DEV, SENTRY_CAPTURE_EXCEPTION_WAIT_TIME_MS, SENTRY_DSN } from '@config';
import { captureException, init, rewriteFramesIntegration, setTags } from '@sentry/node';
import { wait } from '@shared/utils/misc';
import stripAnsi from 'strip-ansi';
import { getStacktapeVersion } from './versioning';

export const initializeSentry = () => {
  if (!IS_DEV) {
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
  }
};

export const setSentryTags = ({ invocationId, command }: { invocationId: string; command: StacktapeCommand }) => {
  setTags({ invocationId, command, osPlatform: process.platform });
};

export const reportErrorToSentry = async (error: ExpectedError | UnexpectedError) => {
  const eventId = captureException(error);

  await wait(SENTRY_CAPTURE_EXCEPTION_WAIT_TIME_MS);

  return eventId;
};
