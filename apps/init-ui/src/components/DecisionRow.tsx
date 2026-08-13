import { useState } from 'react';
import { DECISION_COPY } from '../decisions';
import type { WizardDecision } from '../session';
import { Evidence } from './Evidence';

/**
 * One thing that was decided for you.
 *
 * Reads as a statement, not a question: "Keeping the database you already have on Supabase". Most
 * people will scan the list and change nothing, which is the point — so the row is quiet by default
 * and only opens up when someone wants to disagree with it.
 *
 * The alternatives come from the decision itself rather than from this component, so a new kind can
 * never render a control offering options the composer cannot honour.
 */
export function DecisionRow({
  decision,
  onChange,
  isBusy
}: {
  decision: WizardDecision;
  onChange: (value: string) => void;
  isBusy: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const copy = DECISION_COPY[decision.kind];

  if (copy === undefined) {
    // Unreachable by design — a test asserts every kind has copy — and still handled, because the
    // alternative is a blank row with a dropdown on it.
    return null;
  }

  const others = decision.alternatives.filter((value) => value !== decision.chosen);

  return (
    <article className={`wizard-decision${decision.notable ? ' is-notable' : ''}${isBusy ? ' is-busy' : ''}`}>
      <div className="wizard-decision-head">
        <div className="min-w-0">
          <p className="wizard-decision-summary">{copy.summary(decision.parameters, decision.chosen)}</p>
          <p className="wizard-decision-detail">{copy.detail(decision.parameters, decision.chosen)}</p>
        </div>
        {others.length > 0 && (
          <button
            aria-expanded={isOpen}
            className="wizard-decision-toggle"
            onClick={() => setIsOpen(!isOpen)}
            type="button"
          >
            {isOpen ? 'Close' : 'Change'}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="wizard-decision-options">
          {others.map((value) => {
            const consequence = copy.consequence?.(value, decision.parameters);
            return (
              <button
                className="wizard-decision-option"
                disabled={isBusy}
                key={value}
                onClick={() => {
                  onChange(value);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="wizard-decision-option-label">{copy.option(value, decision.parameters)}</span>
                {consequence !== undefined && <span className="wizard-decision-option-consequence">{consequence}</span>}
              </button>
            );
          })}
          <Evidence citations={decision.evidence} label="Why we thought so" />
        </div>
      )}
    </article>
  );
}
