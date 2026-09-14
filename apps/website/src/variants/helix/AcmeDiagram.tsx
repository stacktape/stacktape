/**
 * The real architecture diagram for the example app, behind a click-to-explore cover.
 *
 * The renderer zooms on wheel and pans on touch, which would trap page scrolling over a 330px
 * area in the middle of a long page. The cover sits above it until the visitor asks to interact,
 * and comes back when the pointer leaves or Escape is pressed.
 *
 * Written with `createElement` rather than JSX on purpose: Vite's dev JSX transform imports
 * `react/jsx-dev-runtime`, and when that module is pre-bundled with NODE_ENV=production its
 * `jsxDEV` export is undefined, so the island throws on hydration and React discards the
 * server-rendered diagram. `createElement` exists in every React build.
 */
import type { StacktapeConfig } from '@stacktape/config';
import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import '@stacktape/ui-react/isometric-diagram.css';
import { createElement, useEffect, useState } from 'react';

type Props = { config: Record<string, unknown> };

const ARIA_LABEL =
  'Architecture of acme-project on AWS: CloudFront in front of the Next.js web, a Fargate web service and a Lambda worker in private subnets, an Aurora PostgreSQL database and a Redis cluster, and a web application firewall';

export default function AcmeDiagram({ config }: Props) {
  const [active, setActive] = useState(false);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setAnimate(!query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const diagram = createElement(IsometricDiagram, {
    animateConnectors: animate,
    ariaLabel: ARIA_LABEL,
    config: config as unknown as StacktapeConfig,
    style: { width: '100%', height: '100%' }
  });

  const control = active
    ? createElement(
        'button',
        { className: 'hx-minibtn hx-diagram__done', type: 'button', onClick: () => setActive(false) },
        'Done'
      )
    : createElement(
        'button',
        {
          className: 'hx-diagram__cover',
          type: 'button',
          'aria-label': 'Explore the architecture diagram: drag to pan, scroll to zoom',
          onClick: () => setActive(true)
        },
        createElement('span', null, 'Explore · drag to pan, scroll to zoom')
      );

  return createElement(
    'div',
    { className: 'hx-diagram', onMouseLeave: () => setActive(false), 'data-active': active ? '' : undefined },
    diagram,
    control
  );
}
