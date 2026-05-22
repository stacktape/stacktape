// Computes a coarse "how much prose changed" signal between two MDX drafts.
//
// Used by the refinement loop to decide whether reviewers need to re-run after a patch. A
// minimal factual fix should leave most prose lines untouched; a large rewrite or new section
// should trigger a reviewer round to catch prose regressions.
//
// We strip fenced code blocks before measuring because:
//   - Code changes are covered by the factual verifier and the deterministic code-block validator.
//   - A 40-line code-example swap shouldn't trigger an unnecessary reviewer round.

const fencedCodeBlock = /```[\s\S]*?```/g;
const mdxComponentBlock = /<CodeBlock\b[\s\S]*?\/>|<ApiReference\b[\s\S]*?\/>|<ReferenceableParams\b[\s\S]*?\/>|<CliCommandsApiReference\b[\s\S]*?\/>|<PropertiesTable\b[\s\S]*?\/>/g;

const stripCodeAndComponents = (mdx: string) =>
  mdx
    .replace(fencedCodeBlock, '')
    .replace(mdxComponentBlock, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

// Longest-common-subsequence length on string arrays. O(n*m). Fine for docs pages — typical
// prose is a few hundred lines at most.
const lcsLength = (a: string[], b: string[]) => {
  if (a.length === 0 || b.length === 0) return 0;
  const dp = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
};

export const computeProseSimilarity = ({ oldMdx, newMdx }: { oldMdx: string; newMdx: string }) => {
  const oldLines = stripCodeAndComponents(oldMdx);
  const newLines = stripCodeAndComponents(newMdx);
  if (oldLines.length === 0 && newLines.length === 0) return 1;
  const lcs = lcsLength(oldLines, newLines);
  const denom = Math.max(oldLines.length, newLines.length);
  if (denom === 0) return 1;
  return lcs / denom;
};
