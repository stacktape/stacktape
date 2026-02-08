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
