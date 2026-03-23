import type {
  CliConfigGenDeployableUnit,
  CliConfigGenPhase,
  CliConfigGenRequiredResource,
  ProductionReadiness
} from '@shared/trpc/public';

export type ConfigGenPhaseInfo = {
  phase: CliConfigGenPhase;
  message: string;
  details?: {
    totalFiles?: number;
    selectedFiles?: string[];
    filesRead?: number;
    filesToRead?: number;
    deployableUnits?: CliConfigGenDeployableUnit[];
    requiredResources?: CliConfigGenRequiredResource[];
  };
};

export type ConfigGenProgressCallback = (info: ConfigGenPhaseInfo) => void;

export type ConfigGenOptions = {
  productionReadiness?: ProductionReadiness;
  onProgress?: ConfigGenProgressCallback;
};

export type ConfigGenResult = {
  config: StacktapeConfig;
  deployableUnits: CliConfigGenDeployableUnit[];
  requiredResources: CliConfigGenRequiredResource[];
};

export type ConfigGenErrorCode = 'TIMEOUT' | 'NETWORK' | 'SERVER' | 'CANCELLED' | 'EMPTY_PROJECT' | 'UNKNOWN';

export class ConfigGenError extends Error {
  code: ConfigGenErrorCode;
  phase?: string;
  retryable: boolean;

  constructor({
    message,
    code,
    phase,
    retryable
  }: {
    message: string;
    code: ConfigGenErrorCode;
    phase?: string;
    retryable?: boolean;
  }) {
    super(message);
    this.name = 'ConfigGenError';
    this.code = code;
    this.phase = phase;
    this.retryable = retryable ?? (code === 'TIMEOUT' || code === 'NETWORK' || code === 'SERVER');
  }
}
