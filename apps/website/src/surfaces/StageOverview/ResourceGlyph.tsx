/*
 * The six resource marks on the Console surface.
 *
 * These are drawn here rather than imported from `@stacktape/ui-react/resource-icon`, and not for
 * want of trying. That component renders the real AWS marks from `aws-react-icons`, a package whose
 * ESM barrel re-exports 1618 CommonJS files by extensionless path: the production build bundles and
 * tree-shakes it into something that works, but the dev server externalizes it and Node then fails
 * to resolve the re-exports at all. A component that only renders in one of the two modes is not a
 * component this site can use.
 *
 * So: one glyph family, drawn on a 24-unit grid at a 1.5 stroke, each framed in the rounded square
 * AWS puts around a resource mark. What matters for recognition is preserved — the shape of the
 * mark and, more importantly, the AWS category colour, which is taken from the shared tokens and is
 * the same assignment `resource-icon/catalog.ts` makes. Compute is orange, database blue, network
 * purple, security red, and `web` stays uncoloured because a framework logo is not an AWS service.
 */
import type { StoryResource } from '../story';

const CATEGORY_COLORS: Readonly<Record<StoryResource['category'], string>> = {
  compute: 'var(--color-aws-compute)',
  database: 'var(--color-aws-database)',
  network: 'var(--color-aws-network)',
  security: 'var(--color-aws-security)'
};

export function ResourceGlyph({ resource, size = 26 }: { resource: StoryResource; size?: number }) {
  /* Keyed on the resource type, not on the instance name — the same thing the product's catalogue
     keys on. A second `nextjs-web` called something other than `web` gets the right mark. */
  const isFramework = resource.type === 'nextjs-web';
  /* A Next.js logo is not an AWS category, and the product draws framework marks in their own right
     for exactly that reason. */
  const color = isFramework ? 'var(--color-fc-primary)' : CATEGORY_COLORS[resource.category];

  return (
    <svg
      aria-hidden="true"
      className="resource-glyph"
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width={size}
    >
      <Mark type={resource.type} />
    </svg>
  );
}

function Mark({ type }: { type: string }) {
  if (type === 'nextjs-web') {
    // The Next.js mark: a ring with the N's stem and diagonal.
    return (
      <>
        <circle cx="12" cy="12" r="9.4" />
        <path d="M8.6 16.2V8.4l7 8.6" />
        <path d="M15 8.4v4.1" />
      </>
    );
  }

  if (type === 'web-service') {
    // Fargate: a container frame with the four task squares inside it.
    return (
      <>
        <rect height="17" rx="3" width="17" x="3.5" y="3.5" />
        <rect height="4" rx="0.8" width="4" x="7" y="7" />
        <rect height="4" rx="0.8" width="4" x="13" y="7" />
        <rect height="4" rx="0.8" width="4" x="7" y="13" />
        <rect height="4" rx="0.8" width="4" x="13" y="13" />
      </>
    );
  }

  if (type === 'function') {
    // Lambda: the λ inside the service frame.
    return (
      <>
        <rect height="17" rx="3" width="17" x="3.5" y="3.5" />
        <path d="M8 16.6 12.4 7.4l3.7 9.2" />
        <path d="M10.4 12.2h3.1" />
      </>
    );
  }

  if (type === 'relational-database') {
    // RDS: the database cylinder.
    return (
      <>
        <rect height="17" rx="3" width="17" x="3.5" y="3.5" />
        <path d="M8 8.6c0-.9 1.8-1.6 4-1.6s4 .7 4 1.6-1.8 1.6-4 1.6-4-.7-4-1.6Z" />
        <path d="M8 8.6v6.8c0 .9 1.8 1.6 4 1.6s4-.7 4-1.6V8.6" />
        <path d="M8 12c0 .9 1.8 1.6 4 1.6s4-.7 4-1.6" />
      </>
    );
  }

  if (type === 'redis-cluster') {
    // ElastiCache for Redis: the stacked cache layers.
    return (
      <>
        <rect height="17" rx="3" width="17" x="3.5" y="3.5" />
        <path d="M7.6 9.2 12 7l4.4 2.2L12 11.4 7.6 9.2Z" />
        <path d="m7.6 12.2 4.4 2.2 4.4-2.2" />
        <path d="m7.6 15.2 4.4 2.2 4.4-2.2" />
      </>
    );
  }

  // Web Application Firewall: the shield, with the mark AWS puts inside it.
  return (
    <>
      <path d="M12 2.8 4.6 5.4v6.1c0 4.8 3.2 8.9 7.4 10 4.2-1.1 7.4-5.2 7.4-10V5.4L12 2.8Z" />
      <path d="M12 7.6c1.5 1.6 2.6 3.1 2.6 4.7a2.6 2.6 0 0 1-5.2 0c0-1.6 1.1-3.1 2.6-4.7Z" />
    </>
  );
}
