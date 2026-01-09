type DeploymentPhase = 'INITIALIZE' | 'BUILD_AND_PACKAGE' | 'UPLOAD' | 'DEPLOY' | 'SUMMARY';

type LoggableEventType =
  | 'PACKAGE_ARTIFACTS'
  | 'REPACKAGE_ARTIFACTS'
  | 'ROLLBACK_STACK'
  | 'CREATE_RESOURCES_FOR_ARTIFACTS'
  | 'UPLOAD_DEPLOYMENT_ARTIFACTS'
  | 'UPDATE_STACK'
  | 'HOTSWAP_UPDATE'
  | 'UPDATE_FUNCTION_CODE'
  | 'REGISTER_ECS_TASK_DEFINITION'
  | 'UPDATE_ECS_SERVICE'
  | 'DELETE_OBSOLETE_ARTIFACTS'
  | 'CLEANUP'
  | 'DELETE_STACK'
  | 'DELETE_ARTIFACTS'
  | 'CALCULATE_CHANGES'
  | 'VALIDATE_TEMPLATE'
  | 'SYNC_BUCKET'
  | 'RESOLVE_DEPENDENCIES'
  | 'ANALYZE_DEPENDENCIES'
  | 'BUILD_CODE'
  | 'REBUILD_CODE'
  | 'CALCULATE_CHECKSUM'
  | 'CALCULATE_SIZE'
  | 'ZIP_PACKAGE'
  | 'UPLOAD_PACKAGE'
  | 'CREATE_DOCKERFILE'
  | 'BUILD_IMAGE'
  | 'UPLOAD_IMAGE'
  | 'UPLOAD_BUCKET_CONTENT'
  | 'DEBUG'
  | 'LOAD_CONFIG_FILE'
  | 'LOAD_METADATA_FROM_AWS'
  | 'FETCH_STACK_DATA'
  | 'REFETCH_STACK_DATA'
  | 'FETCH_DOMAIN_STATUSES'
  | 'FETCH_PREVIOUS_ARTIFACTS'
  | 'REGISTER_CF_PRIVATE_TYPES'
  | 'FETCH_BUDGET_INFO'
  | 'FETCH_MAIL_INFO'
  | 'FETCH_EC2_INFO'
  | 'FETCH_OPENSEARCH_INFO'
  | 'INVALIDATE_CACHE'
  | 'INSTALL_DEPENDENCIES'
  | 'RESOLVE_CONFIG'
  | 'ZIP_PROJECT'
  | 'UPLOAD_PROJECT'
  | 'PREPARE_PIPELINE'
  | 'START_DEPLOYMENT'
  | 'DEPLOY'
  | 'LOAD_AWS_CREDENTIALS'
  | 'ANALYZE_PROJECT'
  | 'LOAD_USER_DATA'
  | 'INJECT_ENVIRONMENT'
  | 'FETCH_USERS_FROM_USERPOOL'
  | 'BUILD_NEXTJS_PROJECT'
  | 'BUNDLING_NEXTJS_FUNCTIONS'
  | 'GENERATE_AI_RESPONSE'
  | 'VALIDATE_CONFIG_TEMP'
  | 'LOAD_TARGET_STACK_INFO'
  | 'LOAD_PROVIDER_CREDENTIALS'
  | 'LOAD_VPC_INFO'
  | 'RUN_SCRIPT'
  | 'STOP_CONTAINER'
  | 'RUN_DEPLOYMENT_SCRIPT'
  | 'ASSUME_ROLE'
  | 'REBUILD_AND_RESTART'
  | 'DEV_SESSION_READY'
  | 'DEV_SESSION_ERROR'
  | 'BUILD_SHARED_LAYER';

type EventLogEntryType = 'START' | 'UPDATE' | 'FINISH';

/**
 * Context for establishing parent-child relationships between events.
 * Used when multiple events of the same type run in parallel (e.g., packaging 3 lambda functions),
 * or when events should be grouped under a parent (e.g., FETCH_STACK_DATA under LOAD_METADATA_FROM_AWS).
 */
type EventContext = {
  /**
   * Identifies a specific instance when multiple events of the same type run in parallel.
   * Examples: "my-lambda-function" when packaging, "my-bucket" when syncing.
   * For nested hierarchies, use dot notation: "myNextjsResource.serverFunction"
   */
  instanceId?: string;
  /**
   * The parent event type this event belongs to.
   * Example: FETCH_STACK_DATA has parentEventType: 'LOAD_METADATA_FROM_AWS'
   */
  parentEventType?: LoggableEventType;
  /**
   * The parent's instance ID, for deeply nested hierarchies.
   * Example: When packaging a NextJS serverFunction, parentInstanceId would be "myNextjsResource"
   */
  parentInstanceId?: string;
};

type EventLogEntry = import('../src/app/event-manager/event-log').EventLogEntry;
type FormattedEventData = import('../src/app/event-manager/event-log').FormattedEventData;
type ChildEventLogEntry = import('../src/app/event-manager/event-log').ChildEventLogEntry;

type EventManagerProgressEvent = {
  eventType: LoggableEventType;
  data?: Record<string, any>;
  skipPrint?: boolean;
  additionalMessage?: string;
  phase?: DeploymentPhase;
} & EventContext;

interface ProgressLogger {
  /**
   * The current event context (parent info and instance ID).
   * Used by child loggers to inherit and extend context.
   */
  get eventContext(): EventContext;
  startEvent: (params: EventManagerProgressEvent & { description: string }) => Promise<any> | void;
  updateEvent: (params: EventManagerProgressEvent) => Promise<any> | void;
  finishEvent: (params: EventManagerProgressEvent & { finalMessage?: string }) => Promise<any> | void;
}

type CleanupHookFunction = (input?: { success: boolean; interrupted: boolean; err?: Error }) => any;
