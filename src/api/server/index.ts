/* eslint-disable no-unsafe-finally */

import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
import { deleteTempFolder } from '@utils/temp-files';
import { parse } from 'yaml';
import { compileTemplateCommand } from './commands';
import { directivesUsableWithDummyCompileTemplate, hasDirectivesOtherThan, replaceDirective } from './utils';

export const runCommand = async ({
  command,
  opts,
  logError
}: {
  opts: StacktapeProgrammaticOptions;
  command: AnyFunction;
  logError: (message: string) => void;
}) => {
  let result: any = null;
  let error: any = null;
  try {
    await applicationManager.init();
    await globalStateManager.init(opts);
    await eventManager.init();
    await deleteTempFolder();
    const resultRef = await command();
    result = JSON.parse(JSON.stringify(resultRef));
    await eventManager.processFinalActions();
  } catch (err) {
    logError(`Error running command ${opts.commands[0]}.`);
    console.error(err);
    error = err.message.replaceAll('$Config at null is invalid.', '').trim();
  } finally {
    calculatedStackOverviewManager.reset();
    configManager.reset();
    templateManager.reset();
    return { result, error };
  }
};

export const compileTemplate = ({
  stackConfig,
  region,
  logError
}: {
  stackConfig: string;
  region: AWSRegion;
  logError: (message: string) => void;
}) => {
  const adjustedStackConfig = replaceDirective({
    yamlString: stackConfig,
    directiveName: 'Secret',
    newValue: 'dummy-secret-value'
  });

  if (hasDirectivesOtherThan(adjustedStackConfig, directivesUsableWithDummyCompileTemplate)) {
    return {
      error: 'Config contains unknown directives or directives that require external context.',
      result: null
    };
  }

  return runCommand({
    opts: {
      config: parse(adjustedStackConfig),
      commands: ['compile-template'],
      args: {
        stage: 'production',
        region
      },
      invokedFrom: 'server'
    },
    logError,
    command: compileTemplateCommand
  });
};
