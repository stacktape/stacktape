// @copied from https://github.com/jcarpanelli/spinnies/blob/master/index.js
import readline from 'node:readline';
import cliCursor from 'cli-cursor';
import stripAnsi from 'strip-ansi';

const dots = {
  interval: 50,
  frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
};
const dashes = {
  interval: 250,
  frames: ['-', '_']
};
const VALID_STATUSES = ['succeed', 'fail', 'spinning'] as const;

function purgeSpinnerOptions(options) {
  const opts = { ...options };

  if (!VALID_STATUSES.includes(options.status)) {
    delete opts.status;
  }

  return { ...opts };
}

function purgeSpinnersOptions({ spinner, disableSpins, ...others }) {
  const prefixes = prefixOptions(others as any);
  const disableSpinsOption = typeof disableSpins === 'boolean' ? { disableSpins } : {};
  spinner = turnToValidSpinner(spinner);

  return { ...prefixes, ...disableSpinsOption, spinner };
}

function turnToValidSpinner(spinner: any = {}) {
  const platformSpinner = terminalSupportsUnicode() ? dots : dashes;
  // @ts-expect-error todo
  if (!typeof spinner === 'object') {
    return platformSpinner;
  }
  let { interval, frames } = spinner;
  if (!Array.isArray(frames) || frames.length < 1) {
    frames = platformSpinner.frames;
  }
  if (typeof interval !== 'number') {
    interval = platformSpinner.interval;
  }

  return { interval, frames };
}

function prefixOptions({ succeedPrefix, failPrefix }) {
  if (terminalSupportsUnicode()) {
    failPrefix = failPrefix || '✖';
  } else {
    failPrefix = failPrefix || '×';
  }

  return { succeedPrefix, failPrefix };
}

function breakText(text, prefixLength) {
  return text
    .split('\n')
    .map((line, index) => (index === 0 ? breakLine(line, prefixLength) : breakLine(line, 0)))
    .join('\n');
}

function breakLine(line, prefixLength) {
  const columns = process.stderr.columns || 95;
  return line.length >= columns - prefixLength
    ? `${line.substring(0, columns - prefixLength - 1)}\n${breakLine(
        line.substring(columns - prefixLength - 1, line.length),
        0
      )}`
    : line;
}

function getLinesLength(text, prefixLength) {
  return stripAnsi(text)
    .split('\n')
    .map((line, index) => (index === 0 ? line.length + prefixLength : line.length));
}

function writeStream(stream, output, rawLines) {
  stream.write(output);
  readline.moveCursor(stream, 0, -rawLines.length);
}

function cleanStream(stream, rawLines) {
  rawLines.forEach((lineLength, index) => {
    readline.moveCursor(stream, lineLength, index);
    readline.clearLine(stream, 1);
    readline.moveCursor(stream, -lineLength, -index);
  });
  readline.moveCursor(stream, 0, rawLines.length);
  readline.clearScreenDown(stream);
  readline.moveCursor(stream, 0, -rawLines.length);
}

function terminalSupportsUnicode() {
  // The default command prompt and powershell in Windows do not support Unicode characters.
  // However, the VSCode integrated terminal and the Windows Terminal both do.
  return process.platform !== 'win32' || process.env.TERM_PROGRAM === 'vscode' || !!process.env.WT_SESSION;
}

type SpinnerStatus = (typeof VALID_STATUSES)[number];

export class Spinnies {
  options: any;
  spinners: {
    [spinnerName: string]: { status: SpinnerStatus; text; succeedPrefix; failPrefix; indent };
  } = {};

  isCursorHidden = false;
  isStopped = false;
  currentInterval: NodeJS.Timeout;
  stream = process.stderr;
  lineCount = 0;
  currentFrameIndex = 0;
  colorizeFail: (text: string) => string;
  colorizeProgress: (text: string) => string;
  succeedPrefix: string;

  constructor(options: {
    succeedPrefix: string;
    colorizeFail: (text: string) => string;
    colorizeProgress: (text: string) => string;
  }) {
    this.colorizeFail = options.colorizeFail;
    this.colorizeProgress = options.colorizeProgress;
    // @ts-expect-error todo
    options = purgeSpinnersOptions(options || ({} as any));
    this.options = {
      spinner: terminalSupportsUnicode() ? dots : dashes,
      disableSpins: false,
      ...options
    };
    this.succeedPrefix = options.succeedPrefix;
  }

  pick(name) {
    return this.spinners[name];
  }

  add(name, options: any = {}) {
    if (typeof name !== 'string') {
      throw new TypeError('A spinner reference name must be specified');
    }
    if (!options.text) {
      options.text = name;
    }
    const spinnerProperties = {
      succeedPrefix: this.options.succeedPrefix,
      failPrefix: this.options.failPrefix,
      status: 'spinning',
      ...purgeSpinnerOptions(options)
    };

    this.spinners[name] = spinnerProperties;
    this.updateSpinnerState();

    return spinnerProperties;
  }

  update(name, options: any = {}) {
    const { status } = options;
    this.setSpinnerProperties(name, options, status);
    this.updateSpinnerState();

    return this.spinners[name];
  }

  succeed(name, options: { text?: string } = {}) {
    delete this.spinners[name];
    // this.setSpinnerProperties(name, options, 'succeed');
    this.updateSpinnerState();
    readline.cursorTo(this.stream, 0);
    readline.clearLine(this.stream, 1);
    console.info(`${this.succeedPrefix} ${options.text}`);
  }

  fail(name, options = {}) {
    this.setSpinnerProperties(name, options, 'fail');
    this.updateSpinnerState();
    return this.spinners[name];
  }

  stopAllSpinners = () => {
    Object.keys(this.spinners).forEach((name) => {
      delete this.spinners[name];
    });
    this.isStopped = true;
    this.updateSpinnerState();
  };

  hasActiveSpinners() {
    return !!Object.values(this.spinners).find(({ status }) => status === 'spinning');
  }

  getSpinnerStatus(spinnerIdentifier: string) {
    return this.spinners[spinnerIdentifier]?.status || null;
  }

  setSpinnerProperties(name: string, options, status: SpinnerStatus = 'spinning') {
    if (!this.spinners[name]) {
      throw new Error(`No spinner initialized with name ${name}`);
    }
    options = purgeSpinnerOptions(options);
    this.spinners[name] = { ...this.spinners[name], ...options, status };
  }

  updateSpinnerState() {
    clearInterval(this.currentInterval);
    if (!this.isStopped) {
      this.currentInterval = this.loopStream();
    }
    if (!this.isCursorHidden) {
      cliCursor.hide();
    }
    this.isCursorHidden = true;
    this.checkIfActiveSpinners();
  }

  loopStream() {
    const { frames, interval } = this.options.spinner;
    return setInterval(() => {
      this.setStreamOutput(frames[this.currentFrameIndex]);
      this.currentFrameIndex = this.currentFrameIndex === frames.length - 1 ? 0 : ++this.currentFrameIndex;
    }, interval);
  }

  setStreamOutput(frame = '') {
    let output = '';
    const linesLength = [];
    const hasActiveSpinners = this.hasActiveSpinners();
    Object.entries(this.spinners).forEach(([_spinnerName, { text, status, indent }]) => {
      let line;
      let prefixLength = indent || 0;
      if (status === 'spinning') {
        prefixLength += frame.length + 1;
        text = breakText(text, prefixLength);
        line = `${this.colorizeProgress(frame)} ${text}`;
      } else if (hasActiveSpinners) {
        text = breakText(text, prefixLength);
      }
      linesLength.push(...getLinesLength(text, prefixLength));
      output += indent ? `${' '.repeat(indent)}${line}\n` : `${line}\n`;
    });

    if (!hasActiveSpinners) {
      readline.clearScreenDown(this.stream);
    }
    writeStream(this.stream, output, linesLength);
    if (hasActiveSpinners) {
      cleanStream(this.stream, linesLength);
    }
    this.lineCount = linesLength.length;
  }

  checkIfActiveSpinners() {
    if (!this.hasActiveSpinners()) {
      this.setStreamOutput();
      readline.moveCursor(this.stream, 0, this.lineCount);
      clearInterval(this.currentInterval);
      this.isCursorHidden = false;
      cliCursor.show();
      this.spinners = {};
    }
  }

  cleanUpAfterExitSignal() {
    cliCursor.show();
    readline.moveCursor(process.stderr, 0, this.lineCount);
  }
}
