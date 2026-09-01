/**
 * Semantic operation types shared by command code and terminal presenters.
 * Nothing in this module depends on a particular renderer.
 */

export type DeploymentPhase = 'INITIALIZE' | 'BUILD_AND_PACKAGE' | 'UPLOAD' | 'DEPLOY' | 'POST_DEPLOY';

export type LoggableEventType =
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
  | 'BUILD_SSR_WEB_PROJECT'
  | 'BUNDLING_SSR_WEB_FUNCTIONS'
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
  | 'BUILD_SHARED_LAYER'
  | 'UPLOAD_SHARED_LAYER'
  | 'BUILD_HOSTING_BUCKET'
  | 'CONNECT_AWS_ACCOUNT'
  | 'SETUP_CICD';

export type OperationStatus = 'pending' | 'running' | 'success' | 'error' | 'warning';
export type OperationMessageType = 'info' | 'warn' | 'error' | 'success' | 'debug' | 'hint' | 'start' | 'announcement';

export type CloudFormationResourceProgress = {
  name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  resourceType?: string;
  since?: number;
};

/** Structured deployment progress shared by human and machine presenters. */
export type CloudFormationProgressDetail = {
  kind: 'cloudformation-progress';
  stackAction: 'create' | 'update' | 'delete' | 'rollback';
  status?: 'active' | 'cleanup';
  completedCount: number;
  totalPlanned?: number;
  percent?: number;
  inProgressCount?: number;
  inProgressResources?: string[];
  inProgressDetails?: CloudFormationResourceProgress[];
  waitingResources?: string[];
  changeCounts: { created: number; updated: number; deleted: number };
  /** Resources completed since the preceding progress record. */
  recentlyCompleted?: CloudFormationResourceProgress[];
};

export type OperationPhasePreset = 'deploy' | 'delete' | 'remote-deploy';
export type TtyView = 'auto' | 'stream' | 'dashboard';
export type ActiveTtyView = Exclude<TtyView, 'auto'>;

export type OperationLink = { label: string; url: string };

export type OperationHeader = {
  projectName: string;
  stageName: string;
  region: string;
  action:
    | 'DEPLOYING'
    | 'DEPLOYING DEV STACK'
    | 'COMPILING TEMPLATE'
    | 'DELETING'
    | 'UPDATING'
    | 'PREVIEWING CHANGES'
    | 'VALIDATING'
    | 'RUNNING DEV MODE'
    | 'RUNNING DEV MODE (legacy)'
    | 'RUNNING SCRIPT'
    | `RUNNING SCRIPT: ${string}`;
  subtitle?: string;
};

export type OperationSelectOption = { label: string; value: string; description?: string };

type PromptBase = { id: string; message: string };
export type OperationPromptRequest =
  | (PromptBase & { type: 'select'; options: OperationSelectOption[]; defaultValue?: string })
  | (PromptBase & { type: 'multiSelect'; options: OperationSelectOption[]; defaultValues?: string[] })
  | (PromptBase & { type: 'confirm'; defaultValue?: boolean })
  | (PromptBase & {
      type: 'text';
      placeholder?: string;
      isPassword?: boolean;
      description?: string;
      defaultValue?: string;
    });

export type OperationActivity = {
  id: string;
  eventType: LoggableEventType;
  description: string;
  phase: DeploymentPhase;
  status: OperationStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  message?: string;
  finalMessage?: string;
  additionalMessage?: string;
  parentActivityId?: string;
  parentEventType?: LoggableEventType;
  parentInstanceId?: string;
  instanceId?: string;
  /** Stable human label; instanceId remains the machine correlation key. */
  label?: string;
  detail?: unknown;
  outputLines: string[];
};

export type OperationPhase = {
  id: DeploymentPhase;
  name: string;
  status: OperationStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  activityIds: string[];
};

export type OperationSummary = {
  success: boolean;
  message: string;
  links: OperationLink[];
  consoleUrl?: string;
};

export type OperationCancellation = { message: string; isCancelling?: boolean };

export type OperationState = {
  sessionId: string;
  startTime: number;
  inputPausedMs: number;
  inputPausedSince?: number;
  phasePreset: OperationPhasePreset;
  showPhaseHeaders: boolean;
  header?: OperationHeader;
  phases: OperationPhase[];
  activities: Record<string, OperationActivity>;
  activityOrder: string[];
  currentPhase?: DeploymentPhase;
  activePrompt?: OperationPromptRequest;
  summary?: OperationSummary;
  pendingCompletion?: OperationSummary;
  cancellation?: OperationCancellation;
  isComplete: boolean;
  isFinalizing: boolean;
};

type OperationRecordBase = { sequence: number; timestamp: number };

export type OperationRecord = OperationRecordBase &
  (
    | { type: 'session-configured'; preset: OperationPhasePreset; showPhaseHeaders: boolean }
    | { type: 'header-set'; header: OperationHeader }
    | { type: 'phase-entered'; phase: DeploymentPhase }
    | { type: 'phase-finished'; phase?: DeploymentPhase }
    | { type: 'activity-started'; activity: OperationActivity }
    | {
        type: 'activity-updated';
        activityId: string;
        description?: string;
        additionalMessage?: string;
        label?: string;
        detail?: unknown;
      }
    | { type: 'activity-output'; activityId: string; lines: string[]; stream: 'stdout' | 'stderr' | 'diagnostic' }
    | {
        type: 'activity-finished';
        activityId: string;
        status: OperationStatus;
        finalMessage?: string;
        detail?: unknown;
      }
    | { type: 'message'; level: OperationMessageType; message: string; source: string }
    | { type: 'prompt-opened'; prompt: OperationPromptRequest }
    | { type: 'prompt-closed'; promptId: string; answer?: string; cancelled: boolean; sensitive: boolean }
    | { type: 'completion-pending'; summary: OperationSummary }
    | { type: 'session-completed'; summary: OperationSummary }
    | { type: 'finalizing' }
    | { type: 'cancellation-set'; cancellation?: OperationCancellation }
    | { type: 'running-marked-error' }
  );

export type OperationRecordInput = OperationRecord extends infer Record
  ? Record extends OperationRecord
    ? Omit<Record, 'sequence' | 'timestamp'>
    : never
  : never;

export type LegacyEventContext = {
  instanceId?: string;
  label?: string;
  parentEventType?: LoggableEventType;
  parentInstanceId?: string;
};

export type LegacyProgressEvent = LegacyEventContext & {
  eventType: LoggableEventType;
  data?: Record<string, unknown>;
  detail?: unknown;
  skipPrint?: boolean;
  additionalMessage?: string;
  description?: string;
  phase?: DeploymentPhase;
  status?: OperationStatus;
};

export interface ProgressReporter {
  readonly eventContext: LegacyEventContext;
  startEvent(params: LegacyProgressEvent & { description: string }): Promise<unknown> | void;
  updateEvent(params: LegacyProgressEvent): Promise<unknown> | void;
  finishEvent(params: LegacyProgressEvent & { finalMessage?: string }): Promise<unknown> | void;
}
