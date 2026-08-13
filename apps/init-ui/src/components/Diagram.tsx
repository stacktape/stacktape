import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import '@stacktape/ui-react/isometric-diagram.css';

/**
 * The wizard's lazy-loading boundary for the isometric diagram, mirroring Console's.
 *
 * The diagram carries an icon catalogue that dwarfs the rest of this app, and the Review step is
 * the only place that needs it. Keeping the stylesheet in this module puts it in the same chunk, so
 * the pair arrives together — after the page is already interactive.
 */
export default IsometricDiagram;
