import { Fragment, type ReactNode } from 'react';

/** An AWS account ID as people read it off the AWS console: "4815 1623 4200". */
export const groupedAccount = (accountId: string) => accountId.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');

/** The name after the last slash of an IAM ARN: the user or role this machine deploys as. */
export const identityName = (arn: string) =>
  arn
    .split(':')
    .at(-1)
    ?.replace(/^(user|assumed-role)\//, '') ?? arn;

export type TargetFact = { label: string; value: ReactNode };

/**
 * Where a deploy goes, as labelled parts on one line: "AWS account 4815 1623 4200 · Signed in as dev · Region eu-west-1
 * · Stage dev". Each part keeps its label, so an IAM user called `dev` and the stage `dev` are not confused. A part does
 * not break inside itself; the line wraps between parts.
 */
export function TargetFacts({
  facts,
  className,
  children
}: {
  facts: ReadonlyArray<TargetFact | undefined | false>;
  className?: string;
  /** Something after the last part, such as a help mark. */
  children?: ReactNode;
}) {
  const shown = facts.filter((fact): fact is TargetFact => fact !== undefined && fact !== false);
  return (
    <p className={['w-target-facts', className].filter(Boolean).join(' ')}>
      {shown.map((fact, index) => (
        <Fragment key={fact.label}>
          {index > 0 && (
            <span aria-hidden className="w-target-facts-dot">
              ·
            </span>
          )}
          <span className="w-target-fact">
            {fact.label} <strong>{fact.value}</strong>
          </span>
        </Fragment>
      ))}
      {children}
    </p>
  );
}
