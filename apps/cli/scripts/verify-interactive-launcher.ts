import stripAnsi from 'strip-ansi';
import packageJson from '../package.json';

// The interactive launcher is drawn by OpenTUI's native library. In a real terminal it must draw, redraw for typed
// input and quit on Ctrl+C, which proves that the embedded library loads, renders and receives keyboard input.
export const verifyInteractiveLauncher = async ({
  binaryPath,
  home,
  version = packageJson.version
}: {
  binaryPath: string;
  home: string;
  /** The version the launcher shows: the checked build's, when it is not this checkout's. */
  version?: string;
}) => {
  let screen = '';
  const decoder = new TextDecoder();
  const launcher = Bun.spawn([binaryPath], {
    env: { PATH: process.env.PATH, HOME: home, STP_DISABLE_TELEMETRY: '1' },
    terminal: {
      cols: 100,
      rows: 30,
      data: (_terminal, data) => {
        screen += decoder.decode(data, { stream: true });
      }
    }
  });
  const waitForScreen = async (text: string, from = 0) => {
    for (const deadline = Date.now() + 20_000; !stripAnsi(screen.slice(from)).includes(text); await Bun.sleep(50)) {
      if (launcher.exitCode !== null || Date.now() > deadline) {
        throw new Error(`The interactive launcher did not show "${text}":\n${stripAnsi(screen).slice(-2_000)}`);
      }
    }
  };

  try {
    await waitForScreen(`v${version}`);
    await waitForScreen('type / for commands');
    const beforeInput = screen.length;
    launcher.terminal?.write('/zzqx');
    await waitForScreen('No commands match.', beforeInput);
    launcher.terminal?.write('\x03');
    const exit = await Promise.race([launcher.exited, Bun.sleep(10_000).then(() => 'still running')]);
    if (exit !== 0) {
      throw new Error(`The interactive launcher did not quit with status 0 on Ctrl+C: ${exit}`);
    }
  } finally {
    launcher.kill();
    launcher.terminal?.close();
  }
};
