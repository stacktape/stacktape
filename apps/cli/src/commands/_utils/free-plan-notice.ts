import { commandLifecycle } from '@application-services/command-lifecycle';
import { tuiManager } from '@application-services/tui-manager';

/**
 * What the Console asks a deploy of a Free organization to say about its monthly limit: the grace countdown with the
 * Flexible estimate, or how close the month's spend is to the limit. The Console decides the sentence; a paid
 * organization never gets one.
 */
let pendingNotice: string | undefined;

export const rememberFreePlanNotice = (notice: string | undefined) => {
  pendingNotice = notice?.trim() || undefined;
};

/** Runs after a successful deploy has printed its result. Billing facts are shown in every output mode, CI included. */
export const showFreePlanNoticeAfterDeploy = () => {
  if (!pendingNotice || commandLifecycle.failedHook) return;
  tuiManager.warn(pendingNotice);
};
