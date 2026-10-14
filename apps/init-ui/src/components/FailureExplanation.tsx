import { Fragment } from 'react';
import type { FailureExplanation as Explanation } from '@stacktape/console-api/failure-explanations';

/** Explanation text with its backticked names set as code. */
function WithCode({ text }: { text: string }) {
  return text.split(/`([^`]+)`/).map((part, index) =>
    index % 2 ? (
      // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed string.
      <code className="wizard-code" key={index}>
        {part}
      </code>
    ) : (
      // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed string.
      <Fragment key={index}>{part}</Fragment>
    )
  );
}

/** What went wrong and what to do, from the shared failure explanations. The original error stays one click away. */
export function FailureExplanationText({ explanations }: { explanations: Explanation[] }) {
  return explanations.map(({ id, cause, action, link }) => (
    <span className="mb-1.5 block" key={id}>
      <WithCode text={cause} /> <WithCode text={action} />
      {link !== undefined && !link.url.startsWith('/') && (
        <>
          {' '}
          <a className="wizard-link" href={link.url} rel="noreferrer" target="_blank">
            {link.label}
          </a>
        </>
      )}
    </span>
  ));
}
