/**
 * How a shell command wraps when its line is too long: only between units, never inside a flag. A unit is one word,
 * a flag with its short value (`--region eu-west-1`), or an operator with the short command after it
 * (`| sh -s -- init`), so a wrapped pipeline breaks before the pipe. Long units (a URL) may still break after a `/`.
 * The code blocks and the home page render commands from these segments; Copy always takes the original text.
 */
export type CommandSegment = { text: string; space: boolean; long: boolean };

const OPERATOR = /^(?:\||\|\||&&|;)$/;
const FLAG = /^-{1,2}[\w-]+$/;
/** A bound unit longer than this would leave a ragged line, so it is not bound. */
const UNIT_MAX = 24;

export const segmentCommand = (line: string): CommandSegment[] => {
  const parts = line.split(/(\s+)/).filter(Boolean);
  const segments: CommandSegment[] = [];
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (/^\s/.test(part)) {
      segments.push({ text: part, space: true, long: false });
      continue;
    }
    let text = part;
    if (OPERATOR.test(part)) {
      // The command after a pipe stays with it while the whole stays short.
      while (index + 2 < parts.length && !OPERATOR.test(parts[index + 2])) {
        const extended = text + parts[index + 1] + parts[index + 2];
        if (extended.length > UNIT_MAX) break;
        text = extended;
        index += 2;
      }
    } else if (FLAG.test(part) && index + 2 < parts.length) {
      const value = parts[index + 2];
      if (!/^[-|&;<>]/.test(value) && !value.includes('/') && (part + value).length < UNIT_MAX) {
        text = part + parts[index + 1] + value;
        index += 2;
      }
    }
    segments.push({ text, space: false, long: text.includes('/') || text.length > 28 });
  }
  return segments;
};

/** Text with a break opportunity after each path `/` (not inside `https://`), so a URL wraps at a path boundary. */
export const pathBreaks = (text: string) => text.split(/(?<=[^/]\/)(?!\/)/);

/** A whole line of shell commands, or lines continued with `\` or a PowerShell backtick, without indented bodies. */
export const isCommandBlock = (code: string) => {
  const lines = code.split('\n');
  return lines.every((line, index) => !/^\s/.test(line) || /[\\`]\s*$/.test(lines[index - 1] ?? ''));
};
