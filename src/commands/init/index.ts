import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { initUsingExistingConfig } from './using-existing-config';
import { initUsingStarterProject } from './using-starter-project';
import { initUsingAiConfigGen } from './using-ai-config-gen';

export const commandInit = async () => {
  if (globalStateManager.args.templateId) {
    return initUsingExistingConfig();
  }
  if (globalStateManager.args.starterId) {
    return initUsingStarterProject();
  }

  const selectedInitType = await tuiManager.promptSelect({
    message: 'How do you want to initialize the project?',
    options: [
      {
        label: 'Generate config using AI (Recommended)',
        description: 'Automatically analyze your project and generate a Stacktape configuration',
        value: 'ai-config-gen'
      },
      {
        label: 'Create new config (template) using Interactive Config Editor',
        description: 'The config will be automatically synced to your project directory',
        value: 'create-config'
      },
      {
        label: 'Use a starter',
        description: 'Select one of 30+ pre-configured starter projects',
        value: 'starter-project'
      }
    ]
  });

  if (selectedInitType === 'ai-config-gen') {
    return initUsingAiConfigGen();
  }

  if (selectedInitType === 'starter-project') {
    return initUsingStarterProject();
  }
};

// const handleAwsCredentials = async () => {
//   const availableProfiles = await getAvailableAwsProfiles();

//   if (!availableProfiles.length) {
//     printer.warn(
//       `No AWS profile is configured on your system.\n       You can configure it using ${printer.prettyCommand(
//         'aws-profile:create'
//       )}\n       To obtain your AWS credentials, you can follow ${printer.terminalLink(
//         'https://docs.stacktape.com/user-guides/configure-aws-profile/',
//         'our detailed guide'
//       )}`
//     );
//   }
// };

// const handleStacktapeApiKey = async () => {
//   if (!globalStateManager.apiKey) {
//     return stacktapeLogin({});
//   }
// };
