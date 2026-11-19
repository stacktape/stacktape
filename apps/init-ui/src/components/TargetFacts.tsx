import { Fragment, type ReactNode } from 'react';

/** An AWS account ID as people read it off the AWS console: "4815 1623 4200". */
export const groupedAccount = (accountId: string) => accountId.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');

/** The name after the last slash of an IAM ARN: the user or role this machine deploys as. */
export const identityName = (arn: string) =>
  arn
    .split(':')
    .at(-1)
    ?.replace(/^(user|assumed-role)\//, '') ?? arn;

export type TargetFact = {
  label: string;
  value: ReactNode;
  /** A help mark right after the value. */
  help?: ReactNode;
  /** Starts a new line on wide screens, such as the cost after where it runs. */
  breakBefore?: boolean;
};

/**
 * Where a deploy goes, as labelled parts: "AWS account 4815 1623 4200 · Signed in as dev · Region eu-west-1 · Stage
 * dev". Each part keeps its label, so an IAM user called `dev` and the stage `dev` are not confused. On a wide screen the
 * parts run on one line and wrap between parts; on a phone they are a column of labels and values.
 */
export function TargetFacts({
  facts,
  className
}: {
  facts: ReadonlyArray<TargetFact | undefined | false>;
  className?: string;
}) {
  const shown = facts.filter((fact): fact is TargetFact => fact !== undefined && fact !== false);
  return (
    <p className={['w-target-facts', className].filter(Boolean).join(' ')}>
      {shown.map((fact, index) => (
        <Fragment key={fact.label}>
          {index > 0 &&
            (fact.breakBefore === true ? (
              <span aria-hidden className="w-target-facts-break" />
            ) : (
              <span aria-hidden className="w-target-facts-dot">
                ·
              </span>
            ))}
          <span className="w-target-fact">
            <span className="w-target-fact-label">{fact.label}</span>{' '}
            <span className="w-target-fact-value">
              <strong>{fact.value}</strong>
              {fact.help}
            </span>
          </span>
        </Fragment>
      ))}
    </p>
  );
}
