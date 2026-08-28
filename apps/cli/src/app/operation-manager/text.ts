const TERMINAL_SEQUENCE =
  // oxlint-disable-next-line no-control-regex -- terminal sanitization intentionally recognizes ANSI control sequences.
  /\x1B\[[0-?]*[ -/]*[@-~]|\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)?|\x1B[@-Z\\-_]|[\x00-\x08\x0B-\x1A\x1C-\x1F\x7F]/g;
// oxlint-disable-next-line no-control-regex -- SGR is the only ANSI sequence safe to preserve in captured output.
const SGR_SEQUENCE = /^\x1B\[[0-9:;]*m$/;

/** Remove every terminal control sequence. Safe for OpenTUI cells and machine output. */
export const plainOperationText = (value: string): string => value.replace(TERMINAL_SEQUENCE, '');

/**
 * Preserve only Select Graphic Rendition sequences from captured child output.
 * Cursor movement, erases, OSC links/titles and other terminal controls must
 * never be replayed into Stacktape's primary-screen presenter.
 */
export const safeCapturedOutput = (value: string, preserveStyle: boolean): string =>
  value.replace(TERMINAL_SEQUENCE, (sequence) => (preserveStyle && SGR_SEQUENCE.test(sequence) ? sequence : ''));
