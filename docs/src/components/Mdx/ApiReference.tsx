/**
 * `<ApiReference definitionName="..." />` — public component used by every generated MDX page
 * to render a property reference for a Stacktape type.
 *
 * The actual implementation lives in `./api-ref-variants/V1.tsx`. This file is a thin facade so
 * the docs gen pipeline (and any hand-written MDX) keeps the original import path while we
 * iterate on the design behind it.
 */
import { ApiReferenceV1 } from './api-ref-variants/V1';

export function ApiReference({ definitionName }: { definitionName: string }) {
  return <ApiReferenceV1 definitionName={definitionName} />;
}

export default ApiReference;
