import type { ApiTypeInfo } from '@/utils/api-reference-dto';
import { cliCommandReference } from 'virtual:stacktape/cli-command-reference';
import { renderDocsMarkdown } from '@/utils/docs-markdown';
import { stripHtml } from '@/utils/api-reference-text';
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

/** Enums longer than this list their first values and fold the rest. */
const VALUES_SHOWN = 12;
/** Commands with more options than this get a row of jump links above the list. */
const JUMP_LIST_MIN = 8;

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

const renderValues = (list: (string | number)[]) =>
  list.map((value) => <code key={String(value)}>{String(value)}</code>);

function AllowedValues({ values }: { values: (string | number)[] }) {
  return (
    <div className="docs-prop-values">
      Allowed values: {renderValues(values.slice(0, VALUES_SHOWN))}
      {values.length > VALUES_SHOWN && (
        <details className="inline">
          <summary>{values.length - VALUES_SHOWN} more</summary> {renderValues(values.slice(VALUES_SHOWN))}
        </details>
      )}
    </div>
  );
}

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

  return (
    <section id={`api-ref-${command}`} className="docs-ref" aria-label={`${usage} options`}>
      <div className="docs-ref-header">
        <div className="docs-ref-title">
          <code>{usage}</code>
          <span>
            {args.length} {args.length === 1 ? 'option' : 'options'}
          </span>
        </div>
      </div>
      {args.length > JUMP_LIST_MIN && (
        <nav className="docs-ref-jump" aria-label={`${usage} options`}>
          {args.map((arg) => (
            <a key={arg.name} href={`#${optionId(command, arg)}`} className="docs-unstyled-link">
              --{arg.flag}
            </a>
          ))}
        </nav>
      )}
      {args.length > 0 ? (
        <ul className="docs-ref-list">
          {args.map((arg) => {
            const [short = '', ...long] = (arg.description || '').split('---');
            const shortHtml = renderDocsMarkdown(short.trim().replace(/^#{1,6}\s+/, ''));
            const longHtml = renderDocsMarkdown(long.join('---').trim());
            const typeInfo = buildTypeInfo(arg.allowedTypes, arg.allowedValues);
            const allowedValues = getAllowedValues(typeInfo);
            const id = optionId(command, arg);
            return (
              <li key={arg.name} id={id} className="docs-prop">
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
                  {stripHtml(shortHtml) && (
                    <div className="docs-prop-description" dangerouslySetInnerHTML={{ __html: shortHtml }} />
                  )}
                  {allowedValues && allowedValues.length > 3 && <AllowedValues values={allowedValues} />}
                  {stripHtml(longHtml) && (
                    <details className="docs-prop-more">
                      <summary className="docs-prop-toggle">More about --{arg.flag}</summary>
                      <div className="docs-prop-details" dangerouslySetInnerHTML={{ __html: longHtml }} />
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="docs-ref-empty">This command has no options.</p>
      )}
    </section>
  );
}
