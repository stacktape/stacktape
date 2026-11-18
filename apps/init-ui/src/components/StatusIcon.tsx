import { BiCheck, BiError, BiX } from 'react-icons/bi';

export type CheckStatus = 'ok' | 'todo' | 'warn' | 'error' | 'busy' | 'idle';

const WORDS: Record<CheckStatus, string> = {
  ok: 'Done',
  todo: 'Needs you',
  warn: 'Check this',
  error: 'Blocked',
  busy: 'Checking',
  idle: 'Not checked yet'
};

/** The circle at the start of a readiness row. The word is always there for screen readers. */
export function StatusIcon({ status }: { status: CheckStatus }) {
  return (
    <span className={`w-status is-${status}`}>
      <span className="sr-only">{WORDS[status]}</span>
      {status === 'ok' && <BiCheck aria-hidden size={16} />}
      {status === 'error' && <BiX aria-hidden size={16} />}
      {status === 'warn' && <BiError aria-hidden size={13} />}
    </span>
  );
}
