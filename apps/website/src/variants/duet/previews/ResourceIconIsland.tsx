import { ResourceIcon } from '@stacktape/ui-react/resource-icon';

/**
 * The product's own resource icon, hydrated on the client.
 *
 * The icon packages behind `ResourceIcon` are CommonJS, and under Astro's server renderer their
 * named exports resolve to nothing, so the component cannot be rendered on the server. The card
 * around it is still server-rendered; only the glyph arrives with JavaScript.
 */
export default function ResourceIconIsland({ type }: { type: string }) {
  return <ResourceIcon resourceType={type} size={20} />;
}
