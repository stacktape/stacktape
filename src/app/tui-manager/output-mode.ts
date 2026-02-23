import ci from 'ci-info';

export type OutputMode = 'tty' | 'plain' | 'jsonl';

export type OutputModeProfile = {
  mode: OutputMode;
  useTtyUi: boolean;
  usePlainStdout: boolean;
  useJsonlStdout: boolean;
  interceptConsole: boolean;
};

export const getOutputModeProfile = (mode: OutputMode): OutputModeProfile => {
  return {
    mode,
    useTtyUi: mode === 'tty',
    usePlainStdout: mode === 'plain',
    useJsonlStdout: mode === 'jsonl',
    interceptConsole: mode !== 'tty'
  };
};

export const resolveOutputMode = ({
  explicitMode,
  forceTty
}: {
  explicitMode?: OutputMode;
  forceTty?: boolean;
}): OutputMode => {
  if (explicitMode) return explicitMode;

  const isTty = (process.stdout.isTTY || forceTty) && !ci.isCI;
  return isTty ? 'tty' : 'plain';
};
