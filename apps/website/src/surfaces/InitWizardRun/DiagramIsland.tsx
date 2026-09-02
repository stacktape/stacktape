import type { StacktapeConfig } from '@stacktape/config';
import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import '@stacktape/ui-react/isometric-diagram.css';

/**
 * The site's lazy-loading boundary for the isometric diagram, mirroring Console's and the wizard's.
 *
 * The diagram carries an icon catalogue that dwarfs everything else this page ships, and one band of
 * one surface is the only place that needs it. Keeping the stylesheet in this module puts it in the
 * same chunk, so the pair arrives together — and `client:visible` on the Astro side means neither
 * arrives until the diagram is actually on screen.
 *
 * It is still server-rendered: Astro renders the SVG into the HTML, so the picture is complete and
 * readable before any JavaScript runs. Hydration only adds pan, zoom, hover focus and tooltips.
 */
export type DiagramIslandProps = {
  /**
   * A parsed Stacktape configuration. It crosses the island boundary as JSON, so it must stay a
   * plain object — see `acme-config.ts`, which is exactly that.
   */
  config: unknown;
  ariaLabel: string;
};

export default function DiagramIsland({ config, ariaLabel }: DiagramIslandProps) {
  return (
    <IsometricDiagram
      ariaLabel={ariaLabel}
      // The literal in `acme-config.ts` is a valid configuration excerpt; the cast states a fact the
      // type system cannot see through Astro's JSON prop channel, exactly as the wizard does it.
      config={config as StacktapeConfig}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
