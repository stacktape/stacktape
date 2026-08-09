import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, ButtonLink, buttonClassName } from './Button.tsx';

test('renders a native button that does not submit the surrounding form by default', () => {
  const markup = renderToStaticMarkup(<Button variant="primary">Deploy</Button>);

  expect(markup).toStartWith('<button');
  expect(markup).toContain('type="button"');
  expect(markup).toContain('Deploy');
});

test('an explicit submit button keeps its type', () => {
  const markup = renderToStaticMarkup(
    <Button type="submit" variant="primary">
      Save
    </Button>
  );

  expect(markup).toContain('type="submit"');
});

test('loading blocks activation, announces the busy state and keeps the accessible name', () => {
  const markup = renderToStaticMarkup(
    <Button isLoading variant="primary">
      Deploy
    </Button>
  );

  expect(markup).toContain('disabled=""');
  expect(markup).toContain('aria-busy="true"');
  // The label is hidden visually, not removed, so screen readers still announce the control.
  expect(markup).toContain('Deploy');
  expect(markup).toContain('stp-ui-button__content--busy');
  // The dots are decoration; the button already carries the busy state.
  expect(markup).toContain('aria-hidden="true"');
});

test('an idle button is neither disabled nor busy', () => {
  const markup = renderToStaticMarkup(<Button variant="secondary">Deploy</Button>);

  expect(markup).not.toContain('disabled');
  expect(markup).not.toContain('aria-busy');
});

test('a disabled button stays disabled without claiming to be busy', () => {
  const markup = renderToStaticMarkup(
    <Button disabled variant="secondary">
      Deploy
    </Button>
  );

  expect(markup).toContain('disabled=""');
  expect(markup).not.toContain('aria-busy');
});

test('the icon renders before or after the label as asked', () => {
  const before = renderToStaticMarkup(
    <Button icon={<svg data-icon />} variant="secondary">
      Github
    </Button>
  );
  const after = renderToStaticMarkup(
    <Button icon={<svg data-icon />} iconPosition="end" variant="secondary">
      Github
    </Button>
  );

  expect(before.indexOf('data-icon')).toBeLessThan(before.indexOf('Github'));
  expect(after.indexOf('data-icon')).toBeGreaterThan(after.indexOf('Github'));
});

test('a link button is an anchor and never nests a button inside it', () => {
  const markup = renderToStaticMarkup(
    <ButtonLink href="https://stacktape.com" rel="noopener noreferrer" target="_blank" variant="primary">
      Sign up
    </ButtonLink>
  );

  expect(markup).toStartWith('<a');
  expect(markup).toContain('href="https://stacktape.com"');
  expect(markup).toContain('target="_blank"');
  expect(markup).not.toContain('<button');
});

test('the consumer class is appended last so it can override the component', () => {
  expect(buttonClassName({ variant: 'danger', className: 'w-full' })).toBe(
    'stp-ui-button stp-ui-button--danger w-full'
  );
  expect(buttonClassName({ variant: 'danger' })).toBe('stp-ui-button stp-ui-button--danger');
});

test('the class helper produces exactly the classes the components render', () => {
  const rendered = renderToStaticMarkup(<Button variant="plain">Cancel</Button>);

  expect(rendered).toContain(`class="${buttonClassName({ variant: 'plain' })}"`);
});
