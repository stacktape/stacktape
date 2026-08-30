import { stringify } from 'yaml';
import { tuiManager } from '@application-services/tui-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { initializeControlPlaneOperation } from '../_utils/initialization';

/**
 * Exports Console-defined alarm rules as stack-config `alarms` entries. Console alarm creation is
 * retired (config is the source of truth); existing Console rules keep applying to deploys until
 * the stack's config declares them, and this command produces exactly what to paste.
 */
export const commandAlarmsExport = async () => {
  await initializeControlPlaneOperation();

  const globalConfig = await stacktapeTrpcApiManager.apiClient.globalConfig();
  const consoleAlarms = globalConfig.alarms || [];
  if (!consoleAlarms.length) {
    tuiManager.info('This organization has no Console-defined alarms. Nothing to export.');
    return null;
  }

  tuiManager.info(
    [
      `Found ${consoleAlarms.length} Console-defined alarm${consoleAlarms.length === 1 ? '' : 's'}.`,
      '',
      'For each alarm below, add the entry to the `alarms` list of every resource it should watch',
      '(shown as "applies to"), then deploy. Once a stack deploys with the alarm in its config, the',
      'Console-defined rule stops applying to that stack and the rule can be deleted in the Console.',
      ''
    ].join('\n')
  );

  for (const wireAlarm of consoleAlarms) {
    const { notificationTargets, forServices, forStages, ...alarm } = wireAlarm as Record<string, unknown> & {
      notificationTargets?: { name: string }[];
      forServices?: string[];
      forStages?: string[];
    };
    const configAlarm = {
      ...alarm,
      notificationChannels: (notificationTargets || []).map(({ name }) => ({
        type: 'console-channel',
        properties: { channelName: name }
      }))
    };
    const appliesTo = [
      `projects: ${!forServices?.length || forServices.includes('*') ? 'all' : forServices.join(', ')}`,
      `stages: ${!forStages?.length || forStages.includes('*') ? 'all' : forStages.join(', ')}`
    ].join(' · ');
    tuiManager.info(`# applies to ${appliesTo}\n${stringify([configAlarm]).trimEnd()}\n`);
  }

  return null;
};
