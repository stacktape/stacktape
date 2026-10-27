/** Lines of a failed step kept in the summary; the full output goes to a file. */
const MAX_SUMMARY_LINES = 20;

/**
 * The part of a failed Docker build's output a developer reads: BuildKit repeats the failing step's output between two
 * `------` lines at the end (`> go build ...:` and the compiler's lines, each after its time in seconds). Tool warnings
 * there (`mise WARN ...`) are left out. Without that block, the lines that mention an error. `undefined` when the
 * output has neither.
 */
export const summarizeDockerBuildError = (output: string): string | undefined => {
  const lines = output.split('\n');
  const blockEnd = lines.findLastIndex((line) => line.trim() === '------');
  const blockStart =
    blockEnd > 0 ? lines.findLastIndex((line, index) => index < blockEnd && line.trim() === '------') : -1;
  if (blockStart >= 0) {
    const [stepLine, ...outputLines] = lines.slice(blockStart + 1, blockEnd);
    const step = stepLine?.trim().replace(/^>\s*/, '').replace(/:$/, '');
    const relevant = outputLines
      .map((line) => line.replace(/^\d+(?:\.\d+)?\s/, '').trimEnd())
      .filter((line) => line.trim() && !/^(?:\S+\s+)?WARN(?:ING)?\b/.test(line.trim()))
      .slice(-MAX_SUMMARY_LINES);
    if (step) return [`Docker build failed in step \`${step}\`:`, ...relevant].join('\n');
  }
  const errorLines = lines
    .map((line) => line.trim())
    .filter((line) => /\berror\b/i.test(line) && !/^Error building docker image\b/.test(line))
    .slice(-MAX_SUMMARY_LINES);
  return errorLines.length ? errorLines.join('\n') : undefined;
};
