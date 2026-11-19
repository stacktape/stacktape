import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { TELEMETRY_NOTICE } from '@utils/telemetry-allowlist';
import { accountFreeTelemetryWouldSend, markTelemetryNoticeShown } from '@utils/telemetry';

/**
 * Without an account, nothing is sent before this machine has shown the telemetry notice once. Machine-readable output
 * cannot show it, so such a run sends nothing and a later run with readable output shows it.
 */
export const showTelemetryNoticeOnce = async () => {
  if (!globalStateManager.isAccountFree || !accountFreeTelemetryWouldSend()) return;
  if (globalStateManager.persistedState?.telemetryNoticeShown) {
    markTelemetryNoticeShown();
    return;
  }
  if (tuiManager.mode === 'jsonl') return;
  tuiManager.info(TELEMETRY_NOTICE);
  try {
    await globalStateManager.markTelemetryNoticeShown();
  } catch {
    // An unwritable home only means the notice is shown again next time.
  }
  markTelemetryNoticeShown();
};
