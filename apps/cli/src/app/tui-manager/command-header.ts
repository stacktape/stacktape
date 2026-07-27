import type { TuiDeploymentHeader } from './types';

type CommandHeaderLike = {
  action: string;
  projectName: string;
  stageName: string;
  region: string;
};

export const COMMAND_HEADER_BOX_MIN_WIDTH = 54;

export const formatCommandHeaderLine = ({ action, projectName, stageName, region }: CommandHeaderLike): string =>
  `--- ${action}: ${projectName} -> ${stageName} (${region}) ---`;

export const formatCommandHeaderProgressMessage = ({
  action,
  projectName,
  stageName,
  region
}: TuiDeploymentHeader): string => `${action}: ${projectName} -> ${stageName} (${region})`;

export const formatCommandHeaderTarget = ({
  projectName,
  stageName,
  region
}: Omit<CommandHeaderLike, 'action'>): string => `${projectName} -> ${stageName} (${region})`;

export const formatSectionHeaderLine = (title: string): string => `--- ${title} ---`;
