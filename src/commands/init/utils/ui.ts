import { tuiManager } from '@application-services/tui-manager';

export type InitConfigFormat = 'yaml' | 'typescript';

export const printInitPreflight = ({
  projectName,
  mode
}: {
  projectName: string;
  mode: 'ai-analysis' | 'starter-template' | 'template-import';
}) => {
  if (mode === 'starter-template') {
    tuiManager.intro(`Initializing project - ${tuiManager.makeBold(projectName)}`);
    tuiManager.printBox({
      title: `Initialize ${projectName}`,
      lines: [
        'Stacktape will download a starter template and prepare deployment config.',
        '',
        tuiManager.makeBold('Flow:'),
        '  1) Download starter files',
        '  2) Choose config format',
        '  3) Estimate costs and show next steps',
        '',
        tuiManager.makeBold('Notes:'),
        '  - This mode does not use AI project analysis',
        '  - Init does not deploy infrastructure'
      ]
    });
    return;
  }

  if (mode === 'template-import') {
    tuiManager.intro(`Initializing project - ${tuiManager.makeBold(projectName)}`);
    tuiManager.printBox({
      title: `Initialize ${projectName}`,
      lines: [
        'Stacktape will fetch an existing template and save it as local config.',
        '',
        tuiManager.makeBold('Flow:'),
        '  1) Resolve template from Stacktape console',
        '  2) Save stacktape.ts or stacktape.yml locally',
        '',
        tuiManager.makeBold('Notes:'),
        '  - This mode does not use AI project analysis',
        '  - Init does not deploy infrastructure'
      ]
    });
    return;
  }

  tuiManager.intro(`Initializing project - ${tuiManager.makeBold(projectName)}`);
  tuiManager.printBox({
    title: `Initialize ${projectName}`,
    lines: [
      'Stacktape will generate deployment config using AI-assisted project analysis.',
      '',
      tuiManager.makeBold('Flow:'),
      '  1) Scan project files locally',
      '  2) Send selected files to Stacktape API for AI analysis',
      '  3) Generate config and estimate costs',
      '',
      tuiManager.makeBold('Notes:'),
      '  - Init does not deploy infrastructure',
      '  - You can review generated config before deploy'
    ]
  });
};

export const promptConfigFormat = async ({
  defaultValue,
  message = 'Config format:'
}: {
  defaultValue?: InitConfigFormat;
  message?: string;
} = {}): Promise<InitConfigFormat> => {
  const selected = await tuiManager.promptSelect({
    message,
    options: [
      {
        label: defaultValue === 'typescript' ? 'TypeScript (Recommended)' : 'TypeScript',
        value: 'typescript',
        description: 'Type-safe with IDE autocompletion'
      },
      {
        label: defaultValue === 'yaml' ? 'YAML (Recommended)' : 'YAML',
        value: 'yaml',
        description: 'Simple declarative format'
      }
    ],
    defaultValue
  });

  return selected as InitConfigFormat;
};
