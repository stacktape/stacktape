/**
 * Locating a cited quote in the file it was drawn from.
 *
 * The naive check — the quote equals the cited line, byte for byte — rejects correct claims far
 * more often than it catches wrong ones. Models re-indent, collapse whitespace, drop a trailing
 * comma, and count lines off by one or two when a file has been read in pages. All of those are
 * still honest citations pointing at real evidence.
 *
 * So matching widens in stages, and reports *how* it matched rather than just whether. A quote
 * found three lines away is fine. The same quote found nine hundred lines away is a different
 * situation: the evidence is real, the location is not, and the caller may want to treat a claim
 * built on it more carefully.
 */

/** How far from the cited line a match still counts as the cited line. */
export const DEFAULT_LINE_WINDOW = 5;

export type QuoteMatch =
  /** Found on the cited line itself. */
  | { outcome: 'exact'; line: number }
  /** Found within the window; `distance` is how many lines off the citation was. */
  | { outcome: 'nearby'; line: number; distance: number }
  /** Present in the file, but nowhere near where the citation said. */
  | { outcome: 'elsewhere'; line: number }
  /** Not in the file at all. */
  | { outcome: 'absent' };

/**
 * Collapse whitespace so indentation and wrapping stop mattering.
 *
 * Case is preserved: source code is case-sensitive, and `DATABASE_URL` and `database_url` are not
 * the same identifier.
 */
export const normalizeForMatch = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * Find `quote` in `lines`, preferring the neighbourhood of `citedLine`.
 *
 * Containment is a substring test rather than equality because a citation usually quotes the
 * meaningful fragment of a line, not the whole line — `app.listen(PORT)` out of a longer statement.
 */
export const matchQuote = (
  lines: readonly string[],
  citedLine: number,
  quote: string,
  window: number = DEFAULT_LINE_WINDOW
): QuoteMatch => {
  const needle = normalizeForMatch(quote);
  if (needle === '') {
    return { outcome: 'absent' };
  }

  const contains = (index: number): boolean => {
    const line = lines[index];
    return line !== undefined && normalizeForMatch(line).includes(needle);
  };

  const citedIndex = citedLine - 1;
  if (contains(citedIndex)) {
    return { outcome: 'exact', line: citedLine };
  }

  // Search outward so the nearest match wins, which keeps `distance` meaningful.
  for (let distance = 1; distance <= window; distance += 1) {
    for (const index of [citedIndex - distance, citedIndex + distance]) {
      if (index >= 0 && contains(index)) {
        return { outcome: 'nearby', line: index + 1, distance };
      }
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (contains(index)) {
      return { outcome: 'elsewhere', line: index + 1 };
    }
  }

  // Last resort: a quote spanning several lines cannot match any single line. Join and look again,
  // which catches multi-line function signatures and wrapped object literals.
  if (needle.includes(' ') && normalizeForMatch(lines.join('\n')).includes(needle)) {
    return { outcome: 'elsewhere', line: citedLine };
  }

  return { outcome: 'absent' };
};

/** Whether a match is good enough to treat the citation as locating real evidence. */
export const isLocated = (match: QuoteMatch): boolean =>
  match.outcome === 'exact' || match.outcome === 'nearby' || match.outcome === 'elsewhere';
