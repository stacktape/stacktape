/**
 * Why a container exited, from its standard error. An interpreted app (Python, Node, Bun, Ruby) that cannot load its
 * code fails only when its container starts; the error quotes where: the app's last traceback frame with its source
 * line and the exception. A program without a recognized traceback gives its last line that mentions an error.
 */

/** The longest quoted frame: its location, the source line and the caret lines under it. */
const MAX_FRAME_LINES = 4;

const PYTHON_FRAME = /^\s+File "(.+)", line \d+/;
/** Frames of the interpreter, installed packages and their entry-point scripts, which an app's error is rarely about. */
const PYTHON_LIBRARY_FILE =
  /(site-packages|dist-packages)\/|^<frozen |\/lib\/python\d[\d.]*\/|\/\.?venv\/|^\/usr\/(?:local\/)?bin\//;
/**
 * Exceptions a server raises after the app failed, such as gunicorn's `HaltServer: 'Worker failed to boot.'` once its
 * workers died of the app's own exception, which an earlier traceback holds.
 */
const PYTHON_WRAPPER_EXCEPTION = /^(?:[\w.]+\.)?(?:HaltServer|SystemExit|KeyboardInterrupt)\b/;

type PythonTraceback = { frames: number[]; exceptionIndex: number };

const findPythonTracebacks = (lines: string[]): PythonTraceback[] =>
  lines.flatMap((line, start) => {
    if (!line.startsWith('Traceback (most recent call last)')) return [];
    const exceptionIndex = lines.findIndex((candidate, index) => index > start && /^\S/.test(candidate));
    if (exceptionIndex < 0) return [];
    const frames = lines
      .slice(start + 1, exceptionIndex)
      .flatMap((frameLine, offset) => (PYTHON_FRAME.test(frameLine) ? [start + 1 + offset] : []));
    return [{ frames, exceptionIndex }];
  });

const isAppFrame = (line: string) => !PYTHON_LIBRARY_FILE.test(line.match(PYTHON_FRAME)![1]!);

/**
 * The traceback to quote: the last one, which ended the process. When that one is a server wrapper, the app's error is
 * in an earlier one: the last raised in the app's own code by something other than a wrapper, else the last that is
 * not a wrapper.
 */
const describePythonTraceback = (lines: string[]): string | undefined => {
  const tracebacks = findPythonTracebacks(lines);
  const isWrapper = ({ exceptionIndex }: PythonTraceback) => PYTHON_WRAPPER_EXCEPTION.test(lines[exceptionIndex]!);
  const last = tracebacks.at(-1);
  const traceback =
    last && isWrapper(last)
      ? (tracebacks.findLast(
          (candidate) => !isWrapper(candidate) && candidate.frames.some((i) => isAppFrame(lines[i]!))
        ) ??
        tracebacks.findLast((candidate) => !isWrapper(candidate)) ??
        last)
      : last;
  if (!traceback) return undefined;
  const { frames, exceptionIndex } = traceback;
  const frameIndex = frames.findLast((index) => isAppFrame(lines[index]!)) ?? frames.at(-1);
  if (frameIndex === undefined) return lines[exceptionIndex];
  const frameEnd = frames.find((index) => index > frameIndex) ?? exceptionIndex;
  const frame = lines.slice(frameIndex, Math.min(frameEnd, frameIndex + MAX_FRAME_LINES));
  return [...frame, lines[exceptionIndex]!].join('\n');
};

/** Bun ends an uncaught error with its version line, `Bun v1.3.0 (Linux x64)`. */
const BUN_VERSION_LINE = /^Bun v\d+\.\d+/;
/** `error: <message>` for an `Error`, `TypeError: <message>` for a subclass. */
const BUN_ERROR_LINE = /^(?:error|[\w$.]*(?:Error|Exception))(?: \[[\w-]+\])?: /;
/** Bun quotes the failing source above the error: `87 | const cache = JSON.parse(…)` and a caret line under it. */
const BUN_CODE_FRAME_LINE = /^\d+ \| /;

const describeBunError = (lines: string[]): string | undefined => {
  const versionIndex = lines.findLastIndex((line) => BUN_VERSION_LINE.test(line));
  if (versionIndex < 0) return undefined;
  const errorIndex = lines.slice(0, versionIndex).findLastIndex((line) => BUN_ERROR_LINE.test(line));
  if (errorIndex < 0) return undefined;
  const above = lines.slice(Math.max(0, errorIndex - 2), errorIndex);
  const source = above.findLastIndex((line) => BUN_CODE_FRAME_LINE.test(line));
  const codeFrame = source < 0 ? [] : above.slice(source).filter((line) => line.trim());
  // Properties of the error (`code: "ER_…"`) come between the message and its stack.
  const stack = lines.slice(errorIndex + 1, versionIndex).filter((line) => /^\s+at /.test(line));
  const frame = stack.find((line) => !NODE_LIBRARY_FRAME.test(line)) ?? stack[0];
  return [...codeFrame, lines[errorIndex]!, ...(frame ? [frame] : [])].join('\n');
};

const NODE_ERROR_LINE = /^(?:Uncaught )?[\w$.]*(?:Error|Exception)\b(?: \[[\w-]+\])?:/;
/** Node prints the failing source line under its location (`/app/index.js:12`) before an uncaught error. */
const NODE_LOCATION_LINE = /^(?:file:\/\/)?(?:\/|[A-Za-z]:[\\/])\S*:\d+$/;
const NODE_LIBRARY_FRAME = /\((?:node:|internal\/)|\bat (?:node:|internal\/)|node_modules[\\/]/;

const describeNodeError = (lines: string[]): string | undefined => {
  const errorIndex = lines.findLastIndex(
    (line, index) => NODE_ERROR_LINE.test(line) && (lines[index + 1] === undefined || /^\s+at /.test(lines[index + 1]!))
  );
  if (errorIndex < 0) return undefined;
  const location = lines
    .slice(Math.max(0, errorIndex - 5), errorIndex)
    .findLastIndex((line) => NODE_LOCATION_LINE.test(line));
  if (location >= 0) {
    const locationIndex = Math.max(0, errorIndex - 5) + location;
    const sourceLines = lines
      .slice(locationIndex, errorIndex)
      .filter((line) => line.trim())
      .slice(0, MAX_FRAME_LINES);
    return [...sourceLines, lines[errorIndex]!].join('\n');
  }
  const stack = lines.slice(errorIndex + 1).filter((line) => /^\s+at /.test(line));
  const frame = stack.find((line) => !NODE_LIBRARY_FRAME.test(line)) ?? stack[0];
  return [lines[errorIndex]!, ...(frame ? [frame] : [])].join('\n');
};

/** `/app/app.rb:3:in '<main>': undefined local variable or method 'foo' for main (NameError)` and syntax errors. */
const RUBY_ERROR_LINE = /\.rb:\d+:.*\((?:[A-Z]\w*)(?:::[A-Z]\w*)*\)$/;
/** Ruby 3.4 quotes a syntax error's source under it: `> 5 | def broken(` and `    | ^ unexpected ...`. */
const RUBY_SOURCE_LINE = /^\s*(?:>\s*)?\d*\s*\|/;

const describeRubyError = (lines: string[]): string | undefined => {
  const errorIndex = lines.findLastIndex((line) => RUBY_ERROR_LINE.test(line));
  if (errorIndex < 0) return undefined;
  const source = lines.slice(errorIndex + 1, errorIndex + 1 + MAX_FRAME_LINES * 2);
  const end = source.findIndex((line) => !RUBY_SOURCE_LINE.test(line));
  const quoted = (end < 0 ? source : source.slice(0, end)).filter((line) => /^\s*>|\^/.test(line));
  return [lines[errorIndex]!, ...quoted].join('\n');
};

/** Rake's first line when a task (`bin/rails db:prepare`, `rake`) raised: `bin/rails aborted!`. */
const RAKE_ABORTED_LINE = /^\S+ aborted!$/;
/** A Ruby backtrace line: `/app/config/application.rb:17:in '<top (required)>'`. */
const RUBY_FRAME = /^\S+:\d+:in [`']/;
/** Frames of Ruby, installed gems and the binstubs that start them, which an app's error is rarely about. */
const RUBY_LIBRARY_FRAME = /\/gems\/|\/lib\/ruby\/|\/rubygems\/|^(?:\S*\/)?bin\/(?:rails|rake|bundle)\b|^<internal:/;

/**
 * Rake prints `bin/rails aborted!`, the exception, its backtrace, `Tasks: TOP => ...` and a help line. The cause and the
 * first frame of the app's own code explain the failure; the help line does not.
 */
const describeRakeAbort = (lines: string[]): string | undefined => {
  const abortedIndex = lines.findLastIndex((line) => RAKE_ABORTED_LINE.test(line));
  if (abortedIndex < 0) return undefined;
  const rest = lines.slice(abortedIndex + 1);
  const firstFrame = rest.findIndex((line) => RUBY_FRAME.test(line));
  const cause = (firstFrame < 0 ? rest : rest.slice(0, firstFrame))
    .filter((line) => line.trim() && !/^Tasks: /.test(line) && !/^\(See full trace/.test(line))
    .slice(0, MAX_FRAME_LINES);
  const frames = firstFrame < 0 ? [] : rest.slice(firstFrame).filter((line) => RUBY_FRAME.test(line));
  const appFrame = frames.find((line) => !RUBY_LIBRARY_FRAME.test(line));
  return [lines[abortedIndex]!, ...cause, ...(appFrame ? [appFrame] : [])].join('\n');
};

export const describeContainerExit = (stderr: string): string | undefined => {
  const lines = stderr.split('\n').map((line) => line.trimEnd());
  const described =
    describePythonTraceback(lines) ??
    describeBunError(lines) ??
    describeNodeError(lines) ??
    describeRakeAbort(lines) ??
    describeRubyError(lines);
  if (described) return described;
  const meaningful = lines.filter((line) => line.trim());
  return (meaningful.findLast((line) => /error/i.test(line)) ?? meaningful.at(-1))?.trim();
};
