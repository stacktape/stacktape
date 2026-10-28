/**
 * Why a container exited, from its standard error. An interpreted app (Python, Node, Ruby) that cannot load its code
 * fails only when its container starts; the error quotes where: the app's last traceback frame with its source line and
 * the exception. A program without a recognized traceback gives its last line that mentions an error.
 */

/** The longest quoted frame: its location, the source line and the caret lines under it. */
const MAX_FRAME_LINES = 4;

const PYTHON_FRAME = /^\s+File "(.+)", line \d+/;
/** Frames of the interpreter and installed packages, which an app's error is rarely about. */
const PYTHON_LIBRARY_FILE = /(site-packages|dist-packages)\/|^<frozen |\/lib\/python\d[\d.]*\//;

const describePythonTraceback = (lines: string[]): string | undefined => {
  const start = lines.findLastIndex((line) => line.startsWith('Traceback (most recent call last)'));
  if (start < 0) return undefined;
  const exceptionIndex = lines.findIndex((line, index) => index > start && /^\S/.test(line));
  if (exceptionIndex < 0) return undefined;
  const frames = lines
    .slice(start + 1, exceptionIndex)
    .flatMap((line, offset) => (PYTHON_FRAME.test(line) ? [start + 1 + offset] : []));
  const frameIndex =
    frames.findLast((index) => !PYTHON_LIBRARY_FILE.test(lines[index]!.match(PYTHON_FRAME)![1]!)) ?? frames.at(-1);
  if (frameIndex === undefined) return lines[exceptionIndex];
  const frameEnd = frames.find((index) => index > frameIndex) ?? exceptionIndex;
  const frame = lines.slice(frameIndex, Math.min(frameEnd, frameIndex + MAX_FRAME_LINES));
  return [...frame, lines[exceptionIndex]!].join('\n');
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

export const describeContainerExit = (stderr: string): string | undefined => {
  const lines = stderr.split('\n').map((line) => line.trimEnd());
  const described = describePythonTraceback(lines) ?? describeNodeError(lines) ?? describeRubyError(lines);
  if (described) return described;
  const meaningful = lines.filter((line) => line.trim());
  return (meaningful.findLast((line) => /error/i.test(line)) ?? meaningful.at(-1))?.trim();
};
