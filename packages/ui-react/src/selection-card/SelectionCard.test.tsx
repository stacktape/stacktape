import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SelectionCard, SelectionCardGroup } from './SelectionCard.tsx';

const noop = () => {};

test('renders a radio, not a generic clickable box', () => {
  const markup = renderToStaticMarkup(
    <SelectionCard isSelected={false} onSelect={noop} title="Claude Code" value="claude" />
  );

  expect(markup).toContain('role="radio"');
  expect(markup).toContain('aria-checked="false"');
});

test('only the selected card is in the tab order, so a group is one tab stop', () => {
  const unselected = renderToStaticMarkup(
    <SelectionCard isSelected={false} onSelect={noop} title="Codex" value="codex" />
  );
  const selected = renderToStaticMarkup(
    <SelectionCard isSelected onSelect={noop} title="Claude Code" value="claude" />
  );

  expect(unselected).toContain('tabindex="-1"');
  expect(selected).toContain('tabindex="0"');
});

test('the description is announced with the option rather than orphaned beside it', () => {
  const markup = renderToStaticMarkup(
    <SelectionCard
      description="Uses your existing subscription."
      isSelected={false}
      onSelect={noop}
      title="Claude Code"
      value="claude"
    />
  );

  const describedBy = /aria-describedby="([^"]+)"/.exec(markup)?.[1];
  expect(describedBy).toBeTruthy();
  expect(markup).toContain(`id="${describedBy}"`);
});

test('omits the description wiring when there is no description', () => {
  const markup = renderToStaticMarkup(<SelectionCard isSelected={false} onSelect={noop} title="Codex" value="codex" />);

  expect(markup).not.toContain('aria-describedby');
});

test('a recommendation is marked without being the loudest thing on the card', () => {
  const markup = renderToStaticMarkup(
    <SelectionCard isRecommended isSelected={false} onSelect={noop} title="Claude Code" value="claude" />
  );

  expect(markup).toContain('stp-ui-selection-card__recommended');
  expect(markup).toContain('Recommended');
});

test('a disabled card is out of the tab order and marked disabled', () => {
  const markup = renderToStaticMarkup(
    <SelectionCard isDisabled isSelected={false} onSelect={noop} title="Copilot" value="copilot" />
  );

  expect(markup).toContain('aria-disabled="true"');
  expect(markup).toContain('tabindex="-1"');
});

test('the icon is decorative, because the title carries the meaning', () => {
  const markup = renderToStaticMarkup(
    <SelectionCard icon={<svg />} isSelected={false} onSelect={noop} title="Claude Code" value="claude" />
  );

  expect(markup).toContain('aria-hidden="true"');
});

test('the group is a real radiogroup with a label', () => {
  const markup = renderToStaticMarkup(
    <SelectionCardGroup ariaLabel="Coding agent" onValueChange={noop} value="claude" values={['claude', 'codex']}>
      <SelectionCard isSelected onSelect={noop} title="Claude Code" value="claude" />
      <SelectionCard isSelected={false} onSelect={noop} title="Codex" value="codex" />
    </SelectionCardGroup>
  );

  expect(markup).toContain('role="radiogroup"');
  expect(markup).toContain('aria-label="Coding agent"');
});

test('every card carries its value, which is how arrow keys find its neighbour', () => {
  const markup = renderToStaticMarkup(<SelectionCard isSelected={false} onSelect={noop} title="Codex" value="codex" />);

  expect(markup).toContain('data-value="codex"');
});
