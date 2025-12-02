import { globalStateManager } from '@application-services/global-state-manager';
import prompts from 'prompts';
import { initUsingExistingConfig } from './using-existing-config';
import { initUsingStarterProject } from './using-starter-project';

export const commandInit = async () => {
  if (globalStateManager.args.templateId) {
    return initUsingExistingConfig();
  }
  if (globalStateManager.args.starterId) {
    return initUsingStarterProject();
  }

  const { selectedInitType } = await prompts({
    type: 'select',
    name: 'selectedInitType',
    message: 'How do you want to initialize the project?',
    choices: [
      {
        title: 'Create new config (template) using Interactive Config Editor',
        description: 'The config will be automatically synced to your project directory',
        value: 'create-config'
      },
      {
        title: 'Use a starter',
        description: 'Select one of 30+ pre-configured starter projects',
        value: 'starter-project'
      }
    ]
  });

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
