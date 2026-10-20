import { useState } from 'react';
import { Button } from '@stacktape/ui-react/button';
import { SelectionCard, SelectionCardGroup } from '@stacktape/ui-react/selection-card';
import { DECISION_COPY } from '../decisions';
import type { WizardDecision } from '../session';
import { Evidence } from './Evidence';
import { Row } from './RowList';

/**
 * One thing that was decided for you.
 *
 * Reads as a statement, not a question: "Keeping the database you already have on Supabase". Most
 * people will scan the list and change nothing, which is the point — so the row is quiet by default
 * and only opens up when someone wants to disagree with it. Opened, it is the same rows as the
 * important choices below it: the current pick selected, the others beside it.
 *
 * The alternatives come from the decision itself rather than from this component, so a new kind can
 * never render a control offering options the composer cannot honour.
 */
export function DecisionRow({
  decision,
  onChange,
  isBusy,
  isLocked = false
}: {
  decision: WizardDecision;
  onChange: (value: string) => void;
  isBusy: boolean;
  /** Read-only while a deploy uses the saved file. */
  isLocked?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const copy = DECISION_COPY[decision.kind];

  if (copy === undefined) {
    // Unreachable by design — a test asserts every kind has copy — and still handled, because the
    // alternative is a blank row with a dropdown on it.
    return null;
  }

  const others = decision.alternatives.filter((value) => value !== decision.chosen);
  const values = [decision.chosen, ...others];
  const choose = (value: string) => {
    if (isBusy || value === decision.chosen) return;
    onChange(value);
    setIsOpen(false);
  };

  return (
    <Row
      description={copy.detail(decision.parameters, decision.chosen)}
      isBusy={isBusy}
      title={copy.summary(decision.parameters, decision.chosen)}
      {...(others.length > 0 && !isLocked
        ? {
            action: (
              <Button aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)} variant="secondary">
                {isOpen ? 'Close' : 'Change'}
              </Button>
            )
          }
        : {})}
    >
      {isOpen && !isLocked && (
        <div className="wizard-decision-options">
          <SelectionCardGroup
            ariaLabel={copy.summary(decision.parameters, decision.chosen)}
            className="wizard-choice-rows"
            direction="column"
            onValueChange={choose}
            value={decision.chosen}
            values={values}
          >
            {values.map((value) => {
              const consequence = copy.consequence?.(value, decision.parameters);
              return (
                <SelectionCard
                  isDisabled={isBusy}
                  isSelected={value === decision.chosen}
                  key={value}
                  onSelect={choose}
                  title={copy.option(value, decision.parameters)}
                  value={value}
                  {...(consequence === undefined ? {} : { description: consequence })}
                />
              );
            })}
          </SelectionCardGroup>
          <Evidence citations={decision.evidence} label="Why we thought so" />
        </div>
      )}
    </Row>
  );
}
