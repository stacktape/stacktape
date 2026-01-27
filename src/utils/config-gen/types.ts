import type { CliConfigGenDeployableUnit, CliConfigGenPhase, CliConfigGenRequiredResource } from '@shared/trpc/public';

// ============ Public API Types (from shared client) ============

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
  deployableUnits: CliConfigGenDeployableUnit[];
  requiredResources: CliConfigGenRequiredResource[];
};
