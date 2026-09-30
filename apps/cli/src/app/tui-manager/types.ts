export type TuiEventStatus = 'pending' | 'running' | 'success' | 'error' | 'warning';

export type TuiLink = {
  label: string;
  url: string;
};

export type TuiMessageType = 'info' | 'warn' | 'error' | 'success' | 'debug' | 'hint' | 'start' | 'announcement';

export type TuiDeploymentHeader = {
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

export type TuiSelectOption = {
  label: string;
  value: string;
  description?: string;
};

export type SupportedConsoleColor = 'cyan' | 'blue' | 'gray' | 'yellow' | 'green' | 'red' | 'magenta';
