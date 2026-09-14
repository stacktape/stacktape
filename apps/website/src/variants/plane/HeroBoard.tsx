import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import '@stacktape/ui-react/isometric-diagram.css';
import { Tabs } from '@stacktape/ui-react/tabs';
import { PICKER_OPTIONS } from './data';

const TABS = PICKER_OPTIONS.map((option) => ({ value: option.id, label: option.label }));

/** Resource keys (two-space indent) get the brand colour; `type:` values get their own so the shape of the file reads. */
function yamlLine(line: string, resourceKeys: Set<string>, index: number): ReactNode {
  const match = line.match(/^(\s*)([A-Za-z_]+):(.*)$/);
  if (!match) return <span key={index}>{line}</span>;
  const [, indent = '', key = '', rest = ''] = match;
  const isResource = resourceKeys.has(key) && indent.length === 2;
  return (
    <span key={index}>
      {indent}
      <span className={isResource ? 'pl-yaml__res' : 'pl-yaml__key'}>{key}</span>:
      {key === 'type' ? <span className="pl-yaml__type">{rest}</span> : rest}
    </span>
  );
}

/**
 * The hero board: pick a repository shape, watch the wizard's trail, the diagram it drew and the file it wrote.
 *
 * The four configurations are plain objects; the real `IsometricDiagram` lays each one out itself,
 * which is the point — nothing here is a picture of a config, it is the config.
 */
export function HeroBoard() {
  const [selected, setSelected] = useState<string>(PICKER_OPTIONS[0]!.id);
  const option = PICKER_OPTIONS.find((candidate) => candidate.id === selected) ?? PICKER_OPTIONS[0]!;
  const resourceKeys = new Set(Object.keys(option.config.resources ?? {}));
  const resourceCount = resourceKeys.size;

  return (
    <div className="pl-board">
      <div className="pl-board__head">
        <Tabs ariaLabel="Example repository" onValueChange={setSelected} tabs={TABS} value={selected} width="fit" />
        <span className="pl-board__tag">Composed by the wizard</span>
      </div>

      <div className="pl-board__body" key={option.id}>
        <div className="pl-board__diagram">
          <IsometricDiagram ariaLabel={`Architecture diagram. ${option.summary}`} config={option.config} />
        </div>

        <ol aria-label="How the wizard arrived at this diagram" className="pl-trail">
          {option.trail.map((step, index) => (
            <li
              className={index === option.trail.length - 1 ? 'pl-trail__chip pl-trail__chip--final' : 'pl-trail__chip'}
              data-step={index + 1}
              key={step}
              style={{ '--pl-i': index } as CSSProperties}
            >
              {step}
            </li>
          ))}
        </ol>

        <div className="pl-decisions">
          <span className="pl-decisions__lead">Decided for you</span>
          <ul className="pl-decisions__list">
            {option.decisions.map((decision) => (
              <li className="pl-decisions__item" key={decision}>
                {decision}
              </li>
            ))}
          </ul>
        </div>

        <figure className="pl-yaml-card">
          <figcaption className="pl-yaml-card__head">
            <span className="pl-yaml-card__file">stacktape.yml</span>
            <span className="pl-yaml-card__note">written by the wizard from your repo · {option.seconds}s</span>
          </figcaption>
          <pre className="pl-yaml pl-yaml--hero">
            <code>
              {option.yaml
                .map((line, at) => ({ line, at, id: `${option.id}:${at}:${line}` }))
                .map((entry) => (
                  <span className="pl-yaml__line" key={entry.id}>
                    {yamlLine(entry.line, resourceKeys, entry.at)}
                  </span>
                ))}
              <span className="pl-yaml__line pl-yaml__more">{'  …'}</span>
            </code>
          </pre>
        </figure>
      </div>

      <div className="pl-board__foot">
        <span className="pl-board__summary">{option.summary}</span>
        <span className="pl-mono">{resourceCount} resources · nothing is created until you deploy</span>
      </div>
    </div>
  );
}
