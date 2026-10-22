import type { ReactNode } from 'react';

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
        <li key={`${gap.subject}-${gap.message}`}>{gap.message}</li>
      ))}
    </ul>
  );
}
