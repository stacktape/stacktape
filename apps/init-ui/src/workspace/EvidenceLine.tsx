import { evidenceSays, lineRange, quoteLabel, type Citation, type ResourceStory } from './resource-story';

/** Text with names from the code in backticks, the names set as code. */
function Ticks({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, index) =>
        // oxlint-disable-next-line react/no-array-index-key -- the parts of one fixed string; position is identity.
        index % 2 === 1 ? <code key={index}>{part}</code> : part
      )}
    </>
  );
}

/**
 * Why a resource is there, in one line: what its evidence shows and where ("Postgres driver in package.json:29"), the
 * line itself when it says nothing plainer, or that Stacktape added it for another resource.
 */
export function EvidenceLine({ story, citation }: { story: ResourceStory; citation: Citation | undefined }) {
  const evidence = story.evidence;
  if (story.designChoice !== undefined) {
    return (
      <span className="ws-evidence">
        <span className="ws-evidence-tag">Added by Stacktape</span>{' '}
        <span className="ws-evidence-says">{story.designChoice}</span>
      </span>
    );
  }
  if (evidence === undefined) {
    return (
      <span className="ws-evidence">
        <span className="ws-evidence-says">
          {story.reason === undefined ? 'Added in stacktape.yml by hand' : story.reason}
        </span>
      </span>
    );
  }
  const says = evidenceSays(story, evidence);
  return (
    <span className="ws-evidence">
      <span className="ws-evidence-says">
        {says === undefined ? <code>{citation?.text[0] ?? quoteLabel(evidence.quote)}</code> : <Ticks text={says} />}
      </span>{' '}
      <span className="ws-evidence-where">
        in {evidence.file}:{lineRange(citation, evidence)}
      </span>
    </span>
  );
}
