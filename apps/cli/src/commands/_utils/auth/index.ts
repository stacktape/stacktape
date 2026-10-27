import { tuiManager } from '@application-services/tui-manager';
import { openBrowser } from '../browser';
import { startApiKeyExchange } from './api-key-exchange';
import { startDeviceSignIn, type DeviceSignInFailure } from './device-authorization';

export type AuthResult = {
  success: boolean;
  apiKey?: string;
  error?: string;
};

/** What a failed browser sign-in tells the person: what happened, then what to do. */
export const deviceSignInFailureMessage = ({ reason, detail }: DeviceSignInFailure): string => {
  switch (reason) {
    case 'expired':
      return 'The sign-in code expired before it was approved. Run stacktape login again.';
    case 'denied':
      return 'The sign-in was denied in the Stacktape Console. Run stacktape login again to sign in.';
    case 'network':
      return 'Could not reach the Stacktape API. Check your internet connection, then run stacktape login again.';
    case 'failed':
      return `The sign-in did not finish${detail ? ` (${detail})` : ''}. Run stacktape login again.`;
  }
};

export const runAuthFlow = async ({
  command,
  openInBrowser = true
}: {
  command: string;
  /** False with `--noBrowser`: the sign-in address is only printed. */
  openInBrowser?: boolean;
}): Promise<AuthResult> => {
  if (command !== 'login') {
    tuiManager.info(tuiManager.makeBold('Authentication required'));
  }

  const authMethod = await tuiManager.promptSelect({
    message: 'How would you like to sign in?',
    options: [
      {
        label: 'Sign in with the browser (Recommended)',
        value: 'browser',
        description: 'Approve this machine in the Stacktape Console. Works with every sign-in method.'
      },
      { label: 'Enter API key manually', value: 'apikey', description: 'Paste an API key created in the Console' }
    ],
    // Without a terminal to ask in, the browser sign-in still works: it only prints an address and a code.
    defaultValue: 'browser'
  });

  if (authMethod === 'apikey') {
    const apiKey = await tuiManager.promptText({
      isPassword: true,
      message: 'Enter your API key'
    });
    return { success: true, apiKey };
  }

  return runBrowserSignIn({ openInBrowser });
};

const runBrowserSignIn = async ({ openInBrowser }: { openInBrowser: boolean }): Promise<AuthResult> => {
  const started = await startDeviceSignIn();
  if (started.ok === false) {
    return { success: false, error: deviceSignInFailureMessage(started) };
  }

  tuiManager.info(`To sign in, open ${started.verificationUriComplete}`);
  tuiManager.info(
    `Your code is ${tuiManager.makeBold(started.userCode)}. Approve only if the Stacktape Console shows the same code.`
  );
  if (openInBrowser) {
    try {
      await openBrowser(started.verificationUriComplete);
      tuiManager.info('Opening your browser. If it does not open, use the address above on any device.');
    } catch {
      tuiManager.info('Could not open a browser here. Open the address above on any device.');
    }
  }

  // Ctrl+C stops polling. Process exit itself is owned by applicationManager's signal handler (TUI teardown,
  // cleanup hooks); exiting here would preempt it.
  let interrupted = false;
  const stop = () => {
    interrupted = true;
    started.cancel();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  const spinner = tuiManager.createSpinner({ text: 'Waiting for approval in the browser' });
  try {
    const outcome = await started.completed;
    if (outcome.ok === false) {
      spinner.error('Sign-in did not finish');
      return { success: false, error: deviceSignInFailureMessage(outcome) };
    }
    spinner.success({ text: 'Approved in the browser' });
    return await exchangeForApiKey(outcome.sessionToken);
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    started.cancel();
    // An interrupted login reports nothing: the process is already on its way out.
    if (interrupted) await new Promise<never>(() => {});
  }
};

const exchangeForApiKey = async (sessionToken: string): Promise<AuthResult> => {
  let exchange: Awaited<ReturnType<typeof startApiKeyExchange>>;
  try {
    exchange = await startApiKeyExchange(sessionToken);
  } catch (error) {
    return { success: false, error: `Could not create a CLI session: ${(error as Error).message}` };
  }

  if (exchange.status === 'failed') {
    return { success: false, error: exchange.error };
  }
  if (exchange.status === 'ready') {
    return { success: true, apiKey: exchange.apiKey };
  }

  const chosen = await tuiManager.promptSelect({
    message: 'Select the organization you want to use.',
    options: exchange.options.map((option) => ({
      label: option.name.endsWith('-personal-org') ? 'Personal' : option.name,
      value: option.id
    }))
  });
  try {
    return await exchange.complete(chosen);
  } catch (error) {
    return { success: false, error: `Could not create a CLI session: ${(error as Error).message}` };
  }
};
