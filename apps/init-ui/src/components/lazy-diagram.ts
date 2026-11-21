import { preloadable } from './preloadable';

/**
 * The diagram's chunk is heavy, so it loads after the page: the analysis starts loading it, and Review and Deploying
 * draw it without a fallback once it is in.
 */
export const { load: loadDiagram, Component: Diagram } = preloadable(() => import('./Diagram'));
