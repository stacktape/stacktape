import { BiCheck, BiX } from 'react-icons/bi';

export type CheckStatus = 'ok' | 'todo' | 'warn' | 'error' | 'busy' | 'idle' | 'locked';

const WORDS: Record<CheckStatus, string> = {
  ok: 'Done',
  todo: 'Needs you',
  warn: 'Check this',
  error: 'Blocked',
  busy: 'Checking',
  idle: 'Optional',
  locked: 'Waiting for an earlier step'
};

/**
 * The mark at the start of a readiness row: a check when done, an amber ring when it needs you, a turning ring while
 * it is being checked, a cross when it blocks the deploy, a faint dashed ring while it waits for an earlier step. The
 * word is always there for screen readers.
 */
export function StatusIcon({ status }: { status: CheckStatus }) {
  return (
    <span className={`w-status is-${status}`}>
      <span className="sr-only">{WORDS[status]}</span>
      {status === 'ok' && <BiCheck aria-hidden size={15} />}
      {status === 'error' && <BiX aria-hidden size={15} />}
      {status === 'warn' && (
        <span aria-hidden className="text-[12px] font-bold leading-none">
          !
        </span>
      )}
    </span>
  );
}
