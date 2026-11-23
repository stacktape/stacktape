import type { ApiTypeInfo } from '@/utils/api-reference-dto';
import { cliCommandReference } from 'virtual:stacktape/cli-command-reference';
import { ChevronDown, Search } from 'react-feather';
import { renderDocsMarkdown } from '@/utils/docs-markdown';
import { stripHtml } from '@/utils/api-reference-text';
import { AllowedValues } from './api-reference';
import { getAllowedValues, getShortTypeInfo, TypeView } from './api-reference/shared';

export type CliCommandArg = {
  name: string;
  flag: string;
  positional?: number;
  required: boolean;
  description?: string;
  alias?: string;
  allowedValues?: string[];
  allowedTypes: string[];
};

/** Commands with more options than this get a filter above the list. */
const FILTER_MIN = 8;

const buildTypeInfo = (allowedTypes?: string[], allowedValues?: string[]): ApiTypeInfo => {
  const types = Array.isArray(allowedTypes) && allowedTypes.length > 0 ? allowedTypes : ['string'];
  return {
    kind: 'primitive',
    types: types.map((type) => (type === 'integer' ? 'number' : type)),
    enumValues: Array.isArray(allowedValues) && allowedValues.length > 0 ? allowedValues : undefined
  };
};

/** The option as the reader types it. The built-site validator compares these names with the command metadata. */
const optionName = (arg: CliCommandArg) =>
  `${arg.alias ? `-${arg.alias}, ` : ''}--${arg.flag}${arg.positional !== undefined ? ` (positional ${arg.positional + 1})` : ''}`;

const optionId = (command: string, arg: CliCommandArg) => `option-${command}-${arg.flag}`;

/** Rendered Markdown of one sentence without its paragraph, for use inside a `<summary>`. */
const unwrapParagraph = (html: string) => html.trim().replace(/^<p>([\s\S]*)<\/p>$/, '$1');

/**
 * An option's description from the CLI metadata is a title (`#### AWS Region`), `---`, then the explanation. The row
 * shows the explanation's first sentence, which says more than a title that repeats the flag, and folds the rest.
 */
const splitDescription = (description: string) => {
  const [title = '', ...body] = description.split('---');
  const label = title.trim().replace(/^#{1,6}\s+/, '');
  const text = body.join('---').trim();
  const sentence = /^([^\n]+?[.!?])(?=\s+[A-Z`*[(]|\s*$)/.exec(text);
  if (!sentence) return { label, lead: '', rest: text };
  return { label, lead: sentence[1], rest: text.slice(sentence[0].length).trim() };
};

/**
 * The options of one CLI command, from the generated command metadata: a static list (no client JavaScript) with a
 * stable link per option, and jump links when the command has many.
 */
export function CliCommandsApiReference({ command }: { command: string }) {
  const reference = cliCommandReference[command];
  if (!reference) throw new Error(`CLI reference command "${command}" was not found. Regenerate CLI artifacts.`);

  const { args, publicName, positionals } = reference;
  // Required positionals in angle brackets, optional ones in square brackets, as in the CLI's own help.
  const usage = `stacktape ${publicName}${positionals
    .map((name) => {
      const arg = args.find((item) => item.name === name);
      const flag = arg?.flag ?? name;
      return arg?.required === false ? ` [${flag}]` : ` <${flag}>`;
    })
    .join('')}`;

  const hasFilter = args.length > FILTER_MIN;

  // The filter is the lookup lists' filter (`directory-filter.ts`, loaded by the island wrapper): it matches a flag by
  // its name, alias or first sentence, and Enter jumps to the first match.
  return (
    <section
      id={`api-ref-${command}`}
      className="docs-ref"
      aria-label={`${usage} options`}
      data-directory={hasFilter ? '' : undefined}
      data-directory-items="li.docs-prop"
    >
      <div className="docs-ref-header">
        <div className="docs-ref-title">
          <code>{usage}</code>
          <span>
            {args.length} {args.length === 1 ? 'option' : 'options'}
          </span>
        </div>
        {hasFilter && (
          <label className="docs-ref-search">
            <Search size={14} aria-hidden />
            <input
              type="search"
              placeholder="Filter options"
              aria-label={`Filter ${usage} options`}
              autoComplete="off"
              spellCheck={false}
              data-directory-filter
            />
          </label>
        )}
      </div>
      {args.length > 0 ? (
        <ul className="docs-ref-list" data-directory-body>
          {args.map((arg) => {
            const { label, lead, rest } = splitDescription(arg.description || '');
            const shortHtml = renderDocsMarkdown(lead || label);
            const longHtml = renderDocsMarkdown(rest);
            const typeInfo = buildTypeInfo(arg.allowedTypes, arg.allowedValues);
            const allowedValues = getAllowedValues(typeInfo);
            const id = optionId(command, arg);
            return (
              <li
                key={arg.name}
                id={id}
                className="docs-prop"
                data-directory-key={`--${arg.flag} ${arg.alias ? `-${arg.alias} ` : ''}${label} ${stripHtml(shortHtml)}`}
              >
                <div className="docs-prop-main">
                  <div className="docs-prop-head">
                    <a href={`#${id}`} className="docs-unstyled-link">
                      <code className="docs-prop-name font-semibold">{optionName(arg)}</code>
                    </a>
                    {arg.required && <span className="docs-prop-badge">Required</span>}
                    <span className="docs-prop-type">
                      <TypeView typeInfo={getShortTypeInfo(typeInfo)} />
                    </span>
                  </div>
                  {/* The first sentence opens the rest of the explanation, so a row needs no separate toggle line. */}
                  {stripHtml(longHtml) ? (
                    <details className="docs-prop-more">
                      <summary className="docs-prop-description docs-prop-summary">
                        <span dangerouslySetInnerHTML={{ __html: unwrapParagraph(shortHtml) }} />
                        <ChevronDown size={14} className="docs-prop-summary-icon" aria-label="More" />
                      </summary>
                      <div className="docs-prop-details" dangerouslySetInnerHTML={{ __html: longHtml }} />
                    </details>
                  ) : (
                    stripHtml(shortHtml) && (
                      <div className="docs-prop-description" dangerouslySetInnerHTML={{ __html: shortHtml }} />
                    )
                  )}
                  {allowedValues && allowedValues.length > 3 && (
                    <AllowedValues values={allowedValues} quoteStrings={false} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="docs-ref-empty">This command has no options.</p>
      )}
      {hasFilter && (
        <p className="docs-ref-empty" data-directory-empty hidden>
          No option matches.
        </p>
      )}
    </section>
  );
}
