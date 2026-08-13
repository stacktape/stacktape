import { useState } from 'react';

/**
 * The lines in the user's own repository that produced a claim.
 *
 * This is the component the whole evidence contract exists to make possible. A developer who does
 * not want to learn what a VPC is will still believe "you need a database" when the sentence under
 * it is a line they wrote, with its filename and line number next to it.
 *
 * Collapsed by default: it is reassurance, not instruction. Someone who trusts the answer should not
 * have to scroll past the proof to reach the button.
 */
export type Citation = { file: string; line: number; quote: string; field?: string };

export function Evidence({ citations, label = 'Why' }: { citations: readonly Citation[]; label?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <button
        aria-expanded={isOpen}
        className="wizard-code text-[0.78rem] text-[var(--stp-text-subtle)] underline decoration-dotted underline-offset-4 hover:text-[var(--stp-text-muted)]"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        {label} ({citations.length})
      </button>

      {isOpen && (
        <ul className="mt-2 flex list-none flex-col gap-1.5 p-0">
          {citations.map((citation, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- two citations can be the same file
            <li className="wizard-code flex gap-3 rounded-md bg-black/20 px-3 py-2" key={`${index}:${citation.file}`}>
              {/* Path and line first: it is what the reader scans for, and it is what they would
                  type into their editor to go and look. */}
              <span className="shrink-0 text-[var(--stp-text-subtle)]">
                {citation.file}:{citation.line}
              </span>
              <span className="min-w-0 flex-1 truncate text-[var(--stp-text-muted)]" title={citation.quote}>
                {citation.quote}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
