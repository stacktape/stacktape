import type { HookType, ScriptFn } from '@utils/scripts';
import { globalStateManager } from '@application-services/global-state-manager';
import { configManager } from '@domain-services/config-manager';
import { stpErrors } from '@errors';
import { printer } from '@utils/printer';
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
  progressPrintingInterval: any;
  finalActions: AnyFunction[];
  currentPhase: DeploymentPhase | null = null;

  /**
   * Context for this logger instance. Used by child loggers to inherit context.
   * - For root eventManager: empty context
   * - For child loggers: contains parentEventType, instanceId, etc.
   */
  private _eventContext: EventContext;

  constructor({
    eventLog,
    hookMap,
    eventContext = {}
  }: {
    eventLog: EventLog;
    hookMap: HookMap;
    eventContext?: EventContext;
  }) {
    this.eventLog = eventLog;
    this.hookMap = hookMap;
    this._eventContext = eventContext;
    this.finalActions = [];
  }

  /**
   * Returns the current event context.
   * Used by child loggers to inherit and extend context.
   */
  get eventContext(): EventContext {
    return this._eventContext;
  }

  setPhase = (phase: DeploymentPhase) => {
    this.currentPhase = phase;
  };

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

  /**
   * Creates a child logger that inherits context and adds its own.
   * Events logged through the child will automatically have the parent context.
   *
   * @param instanceId - Identifies this specific instance (e.g., "my-lambda" when packaging multiple)
   * @param parentEventType - The parent event type (e.g., PACKAGE_ARTIFACTS)
   *
   * @example
   * // For packaging multiple lambdas in parallel:
   * const lambdaLogger = eventManager.createChildLogger({
   *   instanceId: 'my-function',
   *   parentEventType: 'PACKAGE_ARTIFACTS'
   * });
   *
   * @example
   * // For deeply nested events (NextJS functions):
   * const serverFnLogger = parentLogger.createChildLogger({
   *   instanceId: `${parentLogger.eventContext.instanceId}.serverFunction`,
   *   parentEventType: parentLogger.eventContext.parentEventType
   * });
   */
  createChildLogger = ({
    instanceId,
    parentEventType
  }: {
    instanceId: string;
    parentEventType: LoggableEventType;
  }): EventManager => {
    return new EventManager({
      eventLog: this.eventLog,
      hookMap: this.hookMap,
      eventContext: {
        instanceId,
        parentEventType,
        parentInstanceId: this._eventContext.instanceId
      }
    });
  };

  /**
   * @deprecated Use createChildLogger instead. Will be removed in future version.
   */
  getNamespacedInstance = ({
    identifier,
    eventType
  }: {
    identifier: string;
    eventType: LoggableEventType;
  }): EventManager => {
    return this.createChildLogger({ instanceId: identifier, parentEventType: eventType });
  };

  handleEvent = async ({
    eventType,
    description,
    data,
    captureType,
    finalMessage,
    additionalMessage,
    phase,
    instanceId,
    parentEventType,
    parentInstanceId
  }: Omit<EventManagerProgressEvent, 'description'> & {
    captureType: EventLogEntryType;
    description?: string;
    finalMessage?: string;
  }) => {
    // Merge context: explicit params override inherited context
    const resolvedInstanceId = instanceId ?? this._eventContext.instanceId;
    const resolvedParentEventType = parentEventType ?? this._eventContext.parentEventType;
    const resolvedParentInstanceId = parentInstanceId ?? this._eventContext.parentInstanceId;

    this.eventLog.captureEvent({
      eventType,
      captureType,
      data,
      additionalMessage,
      description,
      timestamp: Date.now(),
      finalMessage,
      phase: phase || this.currentPhase,
      instanceId: resolvedInstanceId,
      parentEventType: resolvedParentEventType,
      parentInstanceId: resolvedParentInstanceId
    });
    this.printProgress();
  };

  printProgress = () => {
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

export const eventManager = new EventManager({ eventLog: new EventLog(), hookMap: {} });
