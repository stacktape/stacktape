/**
 * Which "before you deploy" notes to list.
 *
 * Composition adds a generic note per existing deployment tool ("This project has Render deployment config…"), and the
 * Review step already says the same in its alert about that platform. Only those generic notes are dropped: a tool can
 * also carry a specific instruction (Cloudflare Workers bindings, unconnected Pulumi handlers), and a service can share
 * a tool's name.
 */
export const gapsToList = <Gap extends { subject: string; message: string }>(
  gaps: readonly Gap[],
  existingDeployments: ReadonlyArray<{ tool: string }>
): Gap[] =>
  gaps.filter(
    (gap) =>
      !(
        existingDeployments.some((deployment) => deployment.tool === gap.subject) &&
        gap.message.startsWith('This project has ')
      )
  );
