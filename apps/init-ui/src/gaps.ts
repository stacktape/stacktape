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

/**
 * A note before the first deploy, said as what it means for the deploy: a title that states the consequence, and a
 * body with the evidence and the fix. Backticked names in either are set as code.
 */
export type PlainNote = {
  key: string;
  title: string;
  body: string;
  /** The deployment file the note is about, when it names one; `deployment files` when it only says "your files". */
  file?: string | undefined;
};

const sentenceCase = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** "`adminer`" or "`a`, `b` and `c`": whether it reads as one thing or several. */
const isPlural = (quotedList: string) => /`[^`]+`(?:, | and )`/.test(quotedList);

/**
 * The composition's gap messages, which are written for completeness, reworded to lead with what happens on AWS. Each
 * known shape is matched on its exact wording; anything else keeps its own words, split into a first sentence and the
 * rest, and is never cut short.
 */
export const plainNote = (gap: { subject: string; message: string }, configPath = 'stacktape.yml'): PlainNote => {
  const { subject, message } = gap;
  const health =
    /^Your deployment files check (.+?)'s health with (.+?), but (\S+) is not packaged from the Dockerfile that command was written for, so it has no health check\./.exec(
      message
    );
  if (health !== null) {
    const [, , command, name] = health;
    return {
      key: subject,
      file: 'deployment files',
      title: `\`${name}\` runs without a health check on AWS`,
      body: `Your deployment files check it with \`${command}\`, written for a Dockerfile that Stacktape does not build it from. To add a check, set \`internalHealthCheck\` under \`${name}\` in ${configPath}.`
    };
  }
  const notImported = /^(\S+) declares (.+?), which init did not import from it\./.exec(message);
  if (notImported !== null) {
    const [, file, keys] = notImported;
    const plural = isPlural(keys!);
    const them = plural ? 'them' : 'it';
    return {
      key: subject,
      file,
      title: `${keys} from ${file} ${plural ? 'are' : 'is'} not deployed`,
      body: `${file} runs ${them}, but ${configPath} does not. If your app needs ${them} on AWS, add ${them} to ${configPath}.`
    };
  }
  const notCarried = /^(\S+): init did not carry (.+?) of `([^`]+)`(?:: (.+?))?\. Before deploying/.exec(message);
  if (notCarried !== null) {
    const [, file, keys, object, consequence] = notCarried;
    const network = /^networks\.(.+)$/.exec(object!)?.[1];
    if (network !== undefined && keys === '`external`') {
      return {
        key: subject,
        file,
        title: `The \`${network}\` network from ${file} is not created`,
        body: `${file} expects it to exist outside this project. Stacktape connects this stack's services itself, so the deploy does not need it, unless something outside the project reaches them through it.`
      };
    }
    return {
      key: subject,
      file,
      title: `${keys} of \`${object}\` in ${file} is not carried over`,
      body: `${consequence === undefined ? '' : `${sentenceCase(consequence)}. `}If the app depends on it, set the Stacktape equivalent in ${configPath}.`
    };
  }
  const omitted = /^(\S+): init left `([^`]+)` out because it did not carry (.+?)(?:: (.+?))?\. Before deploying/.exec(
    message
  );
  if (omitted !== null) {
    const [, file, object, keys, consequence] = omitted;
    return {
      key: subject,
      file,
      title: `\`${object}\` from ${file} is not deployed`,
      body: `It uses ${keys}, which init could not carry over${consequence === undefined ? '' : `: ${consequence}`}. If you need it, add it to ${configPath} with an equivalent setting.`
    };
  }
  const first = /^(.+?[.!?])(?:\s+(?=[A-Z`"])|$)/s.exec(message.trim());
  const title = (first?.[1] ?? message).trim();
  return { key: subject, title, body: message.trim().slice(title.length).trim() };
};

/** "3 notes about compose.yml" when they share one file, else "3 notes from the analysis". */
export const notesHeading = (notes: readonly PlainNote[]): string => {
  const count = `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`;
  const files = new Set(notes.map((note) => note.file));
  files.delete('deployment files');
  const [file] = files;
  return files.size === 1 && file !== undefined && notes.every((note) => note.file !== undefined)
    ? `${count} about ${file}`
    : `${count} from the analysis`;
};
