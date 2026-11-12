import type { ReactNode } from 'react';

/**
 * A note as text and code: the composition quotes the commands and names it mentions ("npx drizzle-kit migrate",
 * "DATABASE_URL"), and those read as code, without the quotes.
 */
export const withCode = (message: string): ReactNode[] =>
  message.split(/"([^"\n]+)"/).map((part, index) =>
    index % 2 === 1 ? (
      // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed string.
      <code className="wizard-code" key={index}>
        {part}
      </code>
    ) : (
      part
    )
  );

/** The composition's notes about what the file cannot settle, one per line, in both steps' "Before you deploy" rows. */
export function GapList({
  gaps,
  children
}: {
  gaps: ReadonlyArray<{ subject: string; message: string }>;
  /** A note that belongs with the gaps but comes from elsewhere, such as the settings nothing sets. */
  children?: ReactNode;
}) {
  return (
    <ul className="wizard-plain-list">
      {children}
      {gaps.map((gap) => (
        <li key={`${gap.subject}-${gap.message}`}>{withCode(gap.message)}</li>
      ))}
    </ul>
  );
}
