import { stringify } from 'yaml';
import { tuiManager } from '@application-services/tui-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { initializeControlPlaneOperation } from '../_utils/initialization';

/**
 * Exports Console-defined alarm rules as stack-config `alarms` entries. Console alarm creation is
 * retired (config is the source of truth); existing Console rules keep applying to every matching
 * resource until it lists them in `disabledGlobalAlarms` or the rule is deleted, and this command
 * produces exactly what to paste.
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
      '(shown as "applies to") and add the alarm name to that resource\'s `disabledGlobalAlarms`, so',
      'the Console-defined rule does not create a second alarm. Then deploy. Delete the rule in the',
      'Console once every stack it applies to has deployed with the alarm in its config.',
      ''
    ].join('\n')
  );

  for (const wireAlarm of consoleAlarms) {
    const { name, notificationTargets, forServices, forStages, ...alarm } = wireAlarm as Record<string, unknown> & {
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
    tuiManager.info(
      `# alarm ${JSON.stringify(name)}\n# applies to ${appliesTo}\n${stringify([configAlarm]).trimEnd()}\n`
    );
  }

  return null;
};
