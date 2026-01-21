// ============ Session Types (matching server) ============

export type CliConfigGenSessionState = 'WAITING_FOR_FILES' | 'ANALYZING' | 'SUCCESS' | 'ERROR' | 'CANCELLED';

export type CliConfigGenPhase =
  | 'FILE_SELECTION'
  | 'WAITING_FOR_FILE_CONTENTS'
  | 'ANALYZING_DEPLOYMENTS'
  | 'GENERATING_CONFIG'
  | 'ADJUSTING_ENV_VARS';

export type CliConfigGenSessionData = {
  config?: StacktapeConfig;
  deployableUnits?: Array<{
    name: string;
    type: string;
    rootPath: string;
    reason: string;
  }>;
  requiredResources?: Array<{
    type: string;
    reason: string;
  }>;
  error?: { message: string; stack?: string };
  filesToRead?: string[];
};

export type CliConfigGenSession = {
  state: CliConfigGenSessionState;
  phase: CliConfigGenPhase;
  data: CliConfigGenSessionData;
  createdAt: number;
};

// ============ API Types ============

export type StartCliConfigGenInput = {
  fileTree: string;
  allFiles: string[];
};

export type StartCliConfigGenResponse = {
  sessionId: string;
  filesToRead: string[];
};

export type SubmitFilesInput = {
  sessionId: string;
  files: Array<{ path: string; content: string }>;
};

export type SubmitFilesResponse = {
  success: boolean;
};

// ============ Progress Callback Types ============

export type ConfigGenPhaseInfo = {
  phase: CliConfigGenPhase;
  message: string;
  details?: {
    totalFiles?: number;
    selectedFiles?: string[];
    filesRead?: number;
    filesToRead?: number;
  };
};

export type ConfigGenProgressCallback = (info: ConfigGenPhaseInfo) => void;

export type ConfigGenResult = {
  config: StacktapeConfig;
  deployableUnits: Array<{
    name: string;
    type: string;
    rootPath: string;
    reason: string;
  }>;
  requiredResources: Array<{
    type: string;
    reason: string;
  }>;
};
