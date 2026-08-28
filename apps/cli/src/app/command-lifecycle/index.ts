import { globalStateManager } from '@application-services/global-state-manager';
import { operationSession } from '@application-services/operation-manager';
import { configManager } from '@domain-services/config-manager';
import type { Script } from '@domain-services/config-manager/resolved-types/resources';
import { stpErrors } from '@errors';
import type { HookType, ScriptFn } from '@utils/scripts';
import type { AnyFunction } from '@utils/type-helpers';
import { camelCase } from 'change-case';
import ci from 'ci-info';
import { getExecutableScriptFunction } from 'src/commands/script-run/utils';
import type { HookableEvent } from 'src/config/cli/types';
import type { Hooks, NamedScriptLifecycleHook } from '@stacktape/config/shared';

type HookMap = { [lifecycleEvent: string]: ((args: ScriptFn) => unknown)[] };
type HookFailure = { hookEvent: HookableEvent; error: unknown };

const hookEventsRequiringFreshDirectiveResolve: (keyof Hooks)[] = ['afterDeploy'];
const hookEventsRequiringDirectiveCleanup: (keyof Hooks)[] = ['beforeDeploy'];

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

  getEligibleHookScripts(hooks: Hooks): (Script & { hookTrigger: string })[] {
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
        const definition = configManager.scripts[(hook as NamedScriptLifecycleHook).scriptName];
        if (!definition) throw stpErrors.e17({ scriptName: (hook as NamedScriptLifecycleHook).scriptName });
        return { ...definition, ...hook };
      });
  }

  async registerHooks(hooks: Hooks) {
    for (const definition of this.getEligibleHookScripts(hooks)) {
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
      configManager.invalidatePotentiallyChangedDirectiveResults();
    }
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
    if (hookEventsRequiringDirectiveCleanup.includes(hookEvent) && this.hookMap[hookEvent]) {
      configManager.invalidatePotentiallyChangedDirectiveResults();
    }
  }
}

export const commandLifecycle = new CommandLifecycle();
