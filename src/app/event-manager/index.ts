import type { HookType, ScriptFn } from '@utils/scripts';
import { globalStateManager } from '@application-services/global-state-manager';
import { configManager } from '@domain-services/config-manager';
import { stpErrors } from '@errors';
import { printer } from '@utils/printer';
import { deploymentTui } from '@utils/tui/deployment-tui';
import { camelCase } from 'change-case';
import ci from 'ci-info';
import { getExecutableScriptFunction } from 'src/commands/script-run/utils';
import { EventLog } from './event-log';

type HookMap = { [lifecycleEvent: string]: ((args: ScriptFn) => any)[] };

// afterDeploy hooks need to use literal (locally resolved) results of runtime directives.
// during template resource resolving all runtime directives are resolved and cached for purposes of template (references, not literal results)
// we need to invalidate the cached results of runtime directives to allow hooks download locally resolved results
const hookEventsRequiringFreshDirectiveResolve: (keyof Hooks)[] = ['afterDeploy'];

// after beforeDeploy hooks are done, we need to invalidate results of runtime directives
// this is to prevent from leaking literal (locally resolved) values into cloudformation template (such as secrets)
const hookEventsRequiringDirectiveCleanup: (keyof Hooks)[] = ['beforeDeploy'];

export class EventManager implements ProgressLogger {
  hookMap: HookMap;
  eventLog: EventLog;
  namespace: { identifier: string; eventType: LoggableEventType };
  progressPrintingInterval: any;
  finalActions: AnyFunction[];

  constructor({
    eventLog,
    hookMap,
    namespace
  }: {
    eventLog: EventLog;
    hookMap: HookMap;
    namespace: { identifier: string; eventType: LoggableEventType };
  }) {
    this.eventLog = eventLog;
    this.hookMap = hookMap;
    this.namespace = namespace;
    this.finalActions = [];
  }

  get formattedEventLogData() {
    return this.eventLog.formattedData;
  }

  get lastEvent() {
    return this.formattedEventLogData[this.formattedEventLogData.length - 1] || null;
  }

  init = async () => {
    // noop
  };

  getEventDetails(eventType: LoggableEventType) {
    return this.formattedEventLogData.find((e) => e.eventType === eventType);
  }

  getEligibleHookScripts(hooks: Hooks): (Script & { hookTrigger: string })[] {
    const eligibleHookScripts = [
      ...(hooks[camelCase(`before-${globalStateManager.command}`) as keyof Hooks] || []).map((hookScript) => ({
        ...hookScript,
        hookTrigger: camelCase(`before-${globalStateManager.command}`)
      })),
      ...(hooks[camelCase(`after-${globalStateManager.command}`) as keyof Hooks] || []).map((hookScript) => ({
        ...hookScript,
        hookTrigger: camelCase(`after-${globalStateManager.command}`)
      }))
    ];
    return (
      eligibleHookScripts
        // we are filtering scripts which are only limited to local or CI environments
        .filter(({ skipOnCI, skipOnLocal }) => (ci.isCI && !skipOnCI) || (!ci.isCI && !skipOnLocal))
        .map((hookScript) => {
          const scriptDefinition = configManager.scripts[(hookScript as NamedScriptLifecycleHook).scriptName];
          if (!scriptDefinition) {
            throw stpErrors.e17({ scriptName: (hookScript as NamedScriptLifecycleHook).scriptName });
          }
          return { ...scriptDefinition, ...hookScript };
        })
    );
  }

  registerHooks = async (hooks: Hooks) => {
    this.getEligibleHookScripts(hooks).forEach((scriptDefinition) => {
      const trigger = scriptDefinition.hookTrigger;
      const functionToExecute = getExecutableScriptFunction({
        scriptDefinition,
        hookTrigger: trigger
      });
      if (!this.hookMap[trigger]) {
        this.hookMap[trigger] = [];
      }
      this.hookMap[trigger].push(functionToExecute);
    });
  };

  addFinalAction = (hook) => {
    this.finalActions.push(hook);
  };

  processFinalActions = () => {
    return Promise.all(this.finalActions.map((action) => action()));
  };

  processHooks = async ({
    captureType
  }: {
    captureType: 'START' | 'FINISH';
    // commenting out eventType and error - they are not used at the moment but can be in future
    // eventType?: LoggableEventType;
    // error?: any;
  }) => {
    const hookType = { START: 'before', FINISH: 'after' }[captureType] as HookType;
    const command = globalStateManager.command as HookableCommand;
    const hookEvent: HookableEvent = camelCase(`${hookType}-${command}`) as keyof Hooks;
    const handledEvent: HookableEvent = `${hookEvent}`; // ${eventType ? `:${eventType}` : ''}

    // afterDeploy hooks need to use literal (locally resolved) results of runtime directives.
    // during template resource resolving all runtime directives are resolved and cached for purposes of template (references, not literal results)
    // we need to invalidate the cached results of runtime directives to allow hooks download locally resolved results
    if (hookEventsRequiringFreshDirectiveResolve.includes(handledEvent) && this.hookMap[handledEvent]) {
      configManager.invalidatePotentiallyChangedDirectiveResults();
    }
    const hooksForCurrentEvent = this.hookMap[handledEvent];
    if (hooksForCurrentEvent) {
      for (const hook of hooksForCurrentEvent) {
        await hook({ hookType });
      }
    }
    // after beforeDeploy hooks are done, we need to invalidate results of runtime directives
    // this is to prevent from leaking literal (locally resolved) values into cloudformation template (such as secrets)
    if (hookEventsRequiringDirectiveCleanup.includes(handledEvent) && this.hookMap[handledEvent]) {
      configManager.invalidatePotentiallyChangedDirectiveResults();
    }
  };

  getNamespacedInstance = ({ identifier, eventType }: { identifier: string; eventType: LoggableEventType }) => {
    return new EventManager({ eventLog: this.eventLog, hookMap: this.hookMap, namespace: { identifier, eventType } });
  };

  handleEvent = async ({
    eventType,
    description,
    data,
    captureType,
    finalMessage,
    additionalMessage
  }: Omit<EventManagerProgressEvent, 'description'> & {
    captureType: EventLogEntryType;
    description?: string;
    finalMessage?: string;
  }) => {
    // @note we currently don't support hooking into nested events
    // const fullIdentifier = this.namespace ? [this.namespace.identifier, eventType].join('.') : eventType;
    // if (captureType === 'START' || captureType === 'FINISH') {
    //   await this.processHooks({ eventType: fullIdentifier as LoggableEventType, captureType });
    // }
    this.eventLog.captureEvent({
      eventType,
      captureType,
      data,
      additionalMessage,
      description,
      timestamp: Date.now(),
      namespace: this.namespace,
      finalMessage
    });

    // Send formatted events to TUI if active
    if (deploymentTui.isActive) {
      deploymentTui.updateEvents(this.formattedEventLogData);
    }

    this.printProgress();
  };

  printProgress = () => {
    // If TUI is active, skip legacy printing - TUI handles it
    if (deploymentTui.isActive) {
      return;
    }

    for (const event of this.formattedEventLogData) {
      const identifier = event.eventType;
      const eventStatus = printer.getEventStatus(identifier);
      if (eventStatus === 'finished') {
        continue;
      }
      const isEventFinished = event.duration !== null;
      const progressType = eventStatus === null ? 'START' : isEventFinished ? 'FINISH' : 'UPDATE';
      printer.progress({ message: event.printableText, identifier, type: progressType });
    }
  };

  startEvent = async (params: EventManagerProgressEvent & { description: string }) => {
    return this.handleEvent({ ...params, captureType: 'START' });
  };

  updateEvent = async (params: EventManagerProgressEvent) => {
    return this.handleEvent({ ...params, captureType: 'UPDATE' });
  };

  finishEvent = async (params: EventManagerProgressEvent & { finalMessage?: string }) => {
    return this.handleEvent({ ...params, captureType: 'FINISH' });
  };

  reset = () => {
    this.eventLog.reset();
    printer.removeAllFinishedEvents();
  };
}

export const eventManager = new EventManager({ eventLog: new EventLog(), hookMap: {}, namespace: null });
