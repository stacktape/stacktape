import { globalStateManager } from '@application-services/global-state-manager';
import { operationSession } from '@application-services/operation-manager';
import type { configManager } from '@domain-services/config-manager';
import type { Script } from '@domain-services/config-manager/resolved-types/resources';
import { stpErrors } from '@errors';
import type { HookType, ScriptFn } from '@utils/scripts';
import { startTiming } from '@utils/timings';
import type { AnyFunction } from '@utils/type-helpers';
import { camelCase } from 'change-case';
import ci from 'ci-info';
import type { HookableEvent } from 'src/config/cli/types';
import type { Hooks, NamedScriptLifecycleHook } from '@stacktape/config/shared';

type HookMap = { [lifecycleEvent: string]: ((args: ScriptFn) => unknown)[] };
type HookFailure = { hookEvent: HookableEvent; error: unknown };

const hookEventsRequiringFreshDirectiveResolve: (keyof Hooks)[] = ['afterDeploy'];
const hookEventsRequiringDirectiveCleanup: (keyof Hooks)[] = ['beforeDeploy'];
// Only reached once hooks are registered, when the config manager is already loaded.
const invalidateDirectiveResults = async () =>
  (await import('@domain-services/config-manager')).configManager.invalidatePotentiallyChangedDirectiveResults();

/** Hooks and final actions for one command; intentionally unaware of terminal presentation. */
class CommandLifecycle {
  private hookMap: HookMap = {};
  private finalActions: AnyFunction[] = [];
  private failures: HookFailure[] = [];

  init = async () => {
    this.hookMap = {};
    this.finalActions = [];
    this.failures = [];
  };

  get hookFailures(): readonly HookFailure[] {
    return this.failures;
  }

  clearHookFailures() {
    this.failures = [];
  }

  addFinalAction(action: AnyFunction) {
    this.finalActions.push(action);
  }

  processFinalActions() {
    return Promise.all(this.finalActions.map((action) => action()));
  }

  getEligibleHookScripts(
    hooks: Hooks,
    scripts: (typeof configManager)['scripts']
  ): (Script & { hookTrigger: string })[] {
    const candidates = [
      ...(hooks[camelCase(`before-${globalStateManager.command}`) as keyof Hooks] || []).map((hook) => ({
        ...hook,
        hookTrigger: camelCase(`before-${globalStateManager.command}`)
      })),
      ...(hooks[camelCase(`after-${globalStateManager.command}`) as keyof Hooks] || []).map((hook) => ({
        ...hook,
        hookTrigger: camelCase(`after-${globalStateManager.command}`)
      }))
    ];
    return candidates
      .filter(({ skipOnCI, skipOnLocal }) => (ci.isCI && !skipOnCI) || (!ci.isCI && !skipOnLocal))
      .map((hook) => {
        const definition = scripts[(hook as NamedScriptLifecycleHook).scriptName];
        if (!definition) throw stpErrors.e17({ scriptName: (hook as NamedScriptLifecycleHook).scriptName });
        return { ...definition, ...hook };
      });
  }

  // The config manager and script runner are loaded on use: every command starts through this module, and most never
  // register hooks.
  async registerHooks(hooks: Hooks) {
    const [{ configManager: loadedConfigManager }, { getExecutableScriptFunction }] = await Promise.all([
      import('@domain-services/config-manager'),
      import('src/commands/script-run/utils')
    ]);
    for (const definition of this.getEligibleHookScripts(hooks, loadedConfigManager.scripts)) {
      const trigger = definition.hookTrigger;
      const executable = getExecutableScriptFunction({ scriptDefinition: definition, hookTrigger: trigger });
      if (!this.hookMap[trigger]) this.hookMap[trigger] = [];
      this.hookMap[trigger].push(executable);
    }
  }

  async processHooks({
    captureType,
    continueOnError = false
  }: {
    captureType: 'START' | 'FINISH';
    continueOnError?: boolean;
  }) {
    const hookType = { START: 'before', FINISH: 'after' }[captureType] as HookType;
    const hookEvent = camelCase(`${hookType}-${globalStateManager.command}`) as HookableEvent;

    if (hookEventsRequiringFreshDirectiveResolve.includes(hookEvent) && this.hookMap[hookEvent]) {
      await invalidateDirectiveResults();
    }
    const endTiming = startTiming(`hooks:${hookType}`, { hooks: this.hookMap[hookEvent]?.length ?? 0 });
    for (const hook of this.hookMap[hookEvent] ?? []) {
      try {
        await hook({ hookType });
      } catch (error) {
        if (!continueOnError) throw error;
        this.failures.push({ hookEvent, error });
        const fullMessage = error instanceof Error ? error.message : `${error}`;
        operationSession.message(
          'warn',
          `Non-blocking ${hookEvent} hook failed: ${fullMessage.split('\n').find(Boolean) || 'Unknown hook failure'}`
        );
      }
    }
    endTiming();
    if (hookEventsRequiringDirectiveCleanup.includes(hookEvent) && this.hookMap[hookEvent]) {
      await invalidateDirectiveResults();
    }
  }
}

export const commandLifecycle = new CommandLifecycle();
