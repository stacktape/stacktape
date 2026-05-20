import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

// ─── Types mirroring docs/scripts/generate-docs/types.ts (loosely typed for client safety) ───

type ReviewerResult = {
  reviewerId: string;
  persona: string;
  modelProvider: string;
  modelName?: string;
  scores: Record<string, number>;
  strengths: string[];
  problems: string[];
  mandatoryFixes: string[];
  optionalImprovements: string[];
};

type VerifierIssue = {
  severity: 'high' | 'medium' | 'low';
  type: string;
  statement: string;
  reason: string;
  suggestedFix: string;
  evidence?: Array<{ file: string; quote: string }>;
};

type VerifierResult = {
  verifierId: string;
  modelProvider: string;
  modelName?: string;
  summary: string;
  issues: VerifierIssue[];
  positiveFindings: string[];
};

type IterationResult = {
  iteration: number;
  draftPath: string;
  reviewerResults: ReviewerResult[];
  verifierResults: VerifierResult[];
  status?: 'passed' | 'needs-human-review' | 'failed';
  passed: boolean;
};

type HumanFeedbackEntry = {
  addedAt: string;
  iterationAtTime: number;
  text: string;
};

type PipelineState = {
  pageId: string;
  pageRoute: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  iterations: IterationResult[];
  outcome?: 'passed' | 'needs-human-review' | 'failed';
  finalOutputPath?: string;
  pipelineStatus?: string;
  pipelineFailureSummary?: string;
  pipelineReviewSummary?: string;
  agentModelAssignments?: Record<string, string>;
  humanFeedback?: HumanFeedbackEntry[];
};

type GenerationSummary = {
  pageId: string;
  pageRoute: string;
  status: 'passed' | 'needs-human-review' | 'in-progress' | 'failed' | 'unknown';
  updatedAt: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatRelative = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86400_000) return `${Math.round(ms / 3600_000)}h ago`;
  return `${Math.round(ms / 86400_000)}d ago`;
};

const SEVERITY_BG: Record<VerifierIssue['severity'], string> = {
  high: '#7a2826',
  medium: '#6b4d18',
  low: '#3a3d44'
};

// ─── Components ─────────────────────────────────────────────────────────────

function ReviewerCard({ result }: { result: ReviewerResult }) {
  const avg = (Object.values(result.scores).reduce((a, b) => a + b, 0) / Object.values(result.scores).length).toFixed(
    2
  );
  return (
    <div style={{ background: '#1c1f24', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>{result.reviewerId}</strong>
        <span style={{ fontSize: 11, color: '#9aa0a6' }}>
          ({result.modelProvider}
          {result.modelName ? `, ${result.modelName}` : ''})
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600 }}>avg {avg}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', fontSize: 11 }}>
        {Object.entries(result.scores).map(([k, v]) => (
          <span key={k} style={{ background: '#2a2e35', padding: '2px 6px', borderRadius: 4 }}>
            {k}:{v}
          </span>
        ))}
      </div>
      {result.mandatoryFixes.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#e25a4d', marginBottom: 4 }}>Mandatory fixes</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#d1d5db' }}>
            {result.mandatoryFixes.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      {result.problems.length > 0 && (
        <details style={{ marginTop: 6, fontSize: 12, color: '#9aa0a6' }}>
          <summary style={{ cursor: 'pointer' }}>Problems ({result.problems.length})</summary>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: 18 }}>
            {result.problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </details>
      )}
      {result.optionalImprovements.length > 0 && (
        <details style={{ marginTop: 6, fontSize: 12, color: '#9aa0a6' }}>
          <summary style={{ cursor: 'pointer' }}>Optional improvements ({result.optionalImprovements.length})</summary>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: 18 }}>
            {result.optionalImprovements.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function VerifierCard({ result }: { result: VerifierResult }) {
  const sorted = [...result.issues].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    return order[a.severity] - order[b.severity];
  });
  const high = result.issues.filter((i) => i.severity === 'high').length;
  const medium = result.issues.filter((i) => i.severity === 'medium').length;
  const low = result.issues.filter((i) => i.severity === 'low').length;
  return (
    <div style={{ background: '#1c1f24', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>{result.verifierId}</strong>
        <span style={{ fontSize: 11, color: '#9aa0a6' }}>
          ({result.modelProvider}
          {result.modelName ? `, ${result.modelName}` : ''})
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12 }}>
          {high > 0 && <span style={{ color: '#e25a4d', marginRight: 8 }}>{high} high</span>}
          {medium > 0 && <span style={{ color: '#f7a738', marginRight: 8 }}>{medium} medium</span>}
          {low > 0 && <span style={{ color: '#9aa0a6' }}>{low} low</span>}
          {result.issues.length === 0 && <span style={{ color: '#3eb55a' }}>clean</span>}
        </span>
      </div>
      {result.issues.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', fontSize: 12 }}>
          {sorted.map((issue, i) => (
            <li key={i} style={{ background: '#2a2e35', borderRadius: 6, padding: 8, marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: SEVERITY_BG[issue.severity],
                    color: '#fff'
                  }}
                >
                  {issue.severity}
                </span>
                <span style={{ fontSize: 11, color: '#9aa0a6' }}>{issue.type}</span>
              </div>
              <div style={{ color: '#d1d5db', marginBottom: 4 }}>{issue.statement}</div>
              <div style={{ color: '#9aa0a6', fontSize: 11, marginBottom: 4 }}>
                <strong style={{ color: '#bfc3c8' }}>Reason:</strong> {issue.reason}
              </div>
              <div style={{ color: '#9aa0a6', fontSize: 11, marginBottom: 4 }}>
                <strong style={{ color: '#bfc3c8' }}>Fix:</strong> {issue.suggestedFix}
              </div>
              {issue.evidence && issue.evidence.length > 0 && (
                <details style={{ marginTop: 6 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 11, color: '#7c8088' }}>
                    Evidence ({issue.evidence.length})
                  </summary>
                  <div style={{ marginTop: 4 }}>
                    {issue.evidence.map((ev, j) => (
                      <div
                        key={j}
                        style={{
                          background: '#15171a',
                          padding: 6,
                          borderRadius: 4,
                          marginTop: 4,
                          fontSize: 11,
                          color: '#bfc3c8',
                          borderLeft: '2px solid #3a3d44'
                        }}
                      >
                        <code style={{ color: '#7eb6ff', fontSize: 10 }}>{ev.file}</code>
                        <pre
                          style={{
                            margin: '4px 0 0 0',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'ui-monospace, Menlo, monospace'
                          }}
                        >
                          {ev.quote}
                        </pre>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IterationBlock({ iteration, defaultOpen }: { iteration: IterationResult; defaultOpen?: boolean }) {
  const reviewerAvg =
    iteration.reviewerResults.length > 0
      ? (
          iteration.reviewerResults.flatMap((r) => Object.values(r.scores)).reduce((a, b) => a + b, 0) /
          (iteration.reviewerResults.length * 5)
        ).toFixed(2)
      : 'n/a';
  const status = iteration.status || (iteration.passed ? 'passed' : 'failed');
  const statusColor = status === 'passed' ? '#3eb55a' : status === 'needs-human-review' ? '#f7a738' : '#e25a4d';
  return (
    <details open={defaultOpen} style={{ marginBottom: 16 }}>
      <summary style={{ cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid #2a2e35' }}>
        <strong>Iteration {iteration.iteration}</strong>{' '}
        <span style={{ color: statusColor, marginLeft: 8, fontSize: 12 }}>{status}</span>
        <span style={{ marginLeft: 8, color: '#9aa0a6', fontSize: 12 }}>reviewer avg {reviewerAvg}</span>
      </summary>
      <div style={{ marginTop: 12 }}>
        <h4
          style={{
            fontSize: 12,
            color: '#9aa0a6',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            margin: '0 0 8px'
          }}
        >
          Reviewers
        </h4>
        {iteration.reviewerResults.map((r) => (
          <ReviewerCard key={r.reviewerId} result={r} />
        ))}
        <h4
          style={{
            fontSize: 12,
            color: '#9aa0a6',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            margin: '12px 0 8px'
          }}
        >
          Verifiers
        </h4>
        {iteration.verifierResults.map((v) => (
          <VerifierCard key={v.verifierId} result={v} />
        ))}
      </div>
    </details>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();
  const slug = (router.query.slug as string[] | undefined) || [];
  const route = slug.join('/');
  const pageId = route.replaceAll('/', '__');

  const [state, setState] = useState<PipelineState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [siblingPages, setSiblingPages] = useState<GenerationSummary[]>([]);
  const [panelWidth, setPanelWidth] = useState(560);
  const [isResizing, setIsResizing] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<
    | { kind: 'ok'; message: string }
    | { kind: 'error'; message: string }
    | null
  >(null);

  useEffect(() => {
    if (!route) return;
    let alive = true;
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/generation/${encodeURIComponent(pageId)}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (alive) {
          setState(json);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchState();
    const t = setInterval(fetchState, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [route, pageId]);

  useEffect(() => {
    const alive = true;
    const fetchList = async () => {
      try {
        const res = await fetch('/api/generation/list');
        if (!res.ok) return;
        const json = await res.json();
        if (alive) {
          setSiblingPages(
            (json.pages as GenerationSummary[]).filter(
              (p) => p.status === 'needs-human-review' || p.status === 'failed'
            )
          );
        }
      } catch {
        // Best-effort.
      }
    };
    fetchList();
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const next = window.innerWidth - e.clientX;
      setPanelWidth(Math.max(320, Math.min(900, next)));
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);

  const { prevRoute, nextRoute } = useMemo(() => {
    const idx = siblingPages.findIndex((p) => p.pageRoute === route);
    if (idx === -1) return { prevRoute: null, nextRoute: null };
    return {
      prevRoute: idx > 0 ? siblingPages[idx - 1].pageRoute : null,
      nextRoute: idx < siblingPages.length - 1 ? siblingPages[idx + 1].pageRoute : null
    };
  }, [siblingPages, route]);

  const submitFeedback = async ({ spawn }: { spawn: boolean }) => {
    if (!state) return;
    const text = feedbackText.trim();
    if (!text) {
      setFeedbackBanner({ kind: 'error', message: 'Feedback text is empty.' });
      return;
    }
    setFeedbackSubmitting(true);
    setFeedbackBanner(null);
    try {
      const res = await fetch(`/api/generation/${encodeURIComponent(pageId)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, spawn })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `${res.status}`);
      }
      setFeedbackText('');
      setFeedbackBanner({
        kind: 'ok',
        message: spawn
          ? `Saved + re-iterate spawned${json.spawned?.pid ? ` (pid ${json.spawned.pid})` : ''}. Watch /generation for progress.`
          : 'Feedback saved.'
      });
      // Refresh state so the new humanFeedback entry shows up below.
      const stateRes = await fetch(`/api/generation/${encodeURIComponent(pageId)}`);
      if (stateRes.ok) {
        setState(await stateRes.json());
      }
    } catch (e) {
      setFeedbackBanner({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e)
      });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  if (!route) {
    return <div style={{ padding: 24, color: '#9aa0a6' }}>Loading route…</div>;
  }

  const bestIter = state?.iterations ? [...state.iterations].at(-1) : undefined;

  return (
    <>
      <Head>
        <title>{`Review /${route} — Stacktape Docs`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <style jsx global>{`
        body,
        html {
          background: #0e1013;
          color: #e6e8ea;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
        }
        a {
          color: inherit;
          text-decoration: none;
        }
      `}</style>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Left: iframe of the actual page */}
        <main style={{ flex: 1, position: 'relative', background: '#fff' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 36,
              background: '#0e1013',
              color: '#e6e8ea',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 12,
              borderBottom: '1px solid #2a2e35',
              zIndex: 10
            }}
          >
            <Link href="/review" style={{ color: '#7eb6ff' }}>
              ← All review queue
            </Link>
            <span style={{ color: '#9aa0a6' }}>/</span>
            <code style={{ color: '#e6e8ea' }}>/{route}</code>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {prevRoute && (
                <Link
                  href={`/review/${prevRoute}`}
                  style={{ color: '#7eb6ff', padding: '2px 8px', border: '1px solid #2a2e35', borderRadius: 4 }}
                >
                  ← prev
                </Link>
              )}
              {nextRoute && (
                <Link
                  href={`/review/${nextRoute}`}
                  style={{ color: '#7eb6ff', padding: '2px 8px', border: '1px solid #2a2e35', borderRadius: 4 }}
                >
                  next →
                </Link>
              )}
              <a
                href={`/${route}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#7eb6ff', padding: '2px 8px', border: '1px solid #2a2e35', borderRadius: 4 }}
              >
                open in new tab ↗
              </a>
            </div>
          </div>
          <iframe
            key={route}
            src={`/${route}`}
            title={`Preview /${route}`}
            style={{
              position: 'absolute',
              height: '100%',
              top: 36,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              border: 'none'
            }}
          />
        </main>

        {/* Resize handle */}
        <div
          onMouseDown={() => setIsResizing(true)}
          style={{
            width: 4,
            cursor: 'ew-resize',
            background: isResizing ? '#3b82f6' : '#1c1f24',
            transition: isResizing ? 'none' : 'background 0.15s'
          }}
        />

        {/* Right: feedback panel */}
        <aside
          style={{
            width: panelWidth,
            background: '#121417',
            borderLeft: '1px solid #2a2e35',
            overflowY: 'auto',
            padding: 20,
            flexShrink: 0
          }}
        >
          {loading && !state && <div style={{ color: '#9aa0a6' }}>Loading state…</div>}
          {error && (
            <div style={{ color: '#e25a4d' }}>
              No state file for <code>/{route}</code>: {error}
              <div style={{ color: '#9aa0a6', fontSize: 12, marginTop: 8 }}>
                This page may not have been generated yet, or its state was deleted.
              </div>
            </div>
          )}
          {state && (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16 }}>Pipeline feedback</h2>
                <span style={{ fontSize: 11, color: '#9aa0a6', marginLeft: 'auto' }}>
                  {state.iterations.length} iter · updated {formatRelative(state.updatedAt)}
                </span>
              </div>

              {state.pipelineReviewSummary && (
                <div
                  style={{
                    background: '#3a2a13',
                    color: '#f7d89a',
                    padding: 10,
                    borderRadius: 6,
                    fontSize: 12,
                    marginBottom: 12
                  }}
                >
                  <strong>needs-human-review:</strong> {state.pipelineReviewSummary}
                </div>
              )}
              {state.pipelineFailureSummary && (
                <div
                  style={{
                    background: '#3b1f1d',
                    color: '#f0c3bf',
                    padding: 10,
                    borderRadius: 6,
                    fontSize: 12,
                    marginBottom: 12
                  }}
                >
                  <strong>did-not-pass:</strong> {state.pipelineFailureSummary}
                </div>
              )}

              {state.agentModelAssignments && (
                <details style={{ marginBottom: 12, fontSize: 12, color: '#9aa0a6' }}>
                  <summary style={{ cursor: 'pointer' }}>Agent models</summary>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', marginTop: 8 }}>
                    {Object.entries(state.agentModelAssignments).map(([agent, model]) => (
                      <div key={agent} style={{ display: 'contents' }}>
                        <code>{agent}</code>
                        <span>{model}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* ── Human feedback panel ───────────────────────────────────── */}
              <div
                style={{
                  background: '#15171a',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  border: '1px solid #2a2e35'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    marginBottom: 8
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 13, color: '#f7d89a' }}>Your feedback</h3>
                  <span style={{ fontSize: 11, color: '#9aa0a6' }}>
                    {(state.humanFeedback || []).length} previous note
                    {(state.humanFeedback || []).length === 1 ? '' : 's'}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 11, color: '#9aa0a6', lineHeight: 1.5 }}>
                  Anything you noticed reading the page — wrong tone, missing context, an example that
                  doesn't match how this resource is actually used. Highest-priority signal: the writer
                  is told to address this before any reviewer/verifier feedback.
                </p>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g. The opening paragraph reads like a marketing landing page. Cut the 'powerful' and lead with what the reader actually does in 30 seconds."
                  rows={4}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#0e1013',
                    border: '1px solid #2a2e35',
                    color: '#e6e8ea',
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => submitFeedback({ spawn: true })}
                    disabled={feedbackSubmitting || !feedbackText.trim()}
                    style={{
                      background: feedbackText.trim() ? '#3b82f6' : '#2a2e35',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: feedbackText.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {feedbackSubmitting ? 'Working…' : 'Save & re-iterate'}
                  </button>
                  <button
                    onClick={() => submitFeedback({ spawn: false })}
                    disabled={feedbackSubmitting || !feedbackText.trim()}
                    style={{
                      background: 'transparent',
                      color: '#9aa0a6',
                      border: '1px solid #2a2e35',
                      padding: '6px 12px',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: feedbackText.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Save only
                  </button>
                  <span style={{ fontSize: 11, color: '#7c8088', marginLeft: 'auto' }}>
                    {feedbackText.length}/10000
                  </span>
                </div>
                {feedbackBanner && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 8,
                      borderRadius: 4,
                      fontSize: 11,
                      background: feedbackBanner.kind === 'ok' ? '#1d3a23' : '#3b1f1d',
                      color: feedbackBanner.kind === 'ok' ? '#a8e0b0' : '#f0c3bf'
                    }}
                  >
                    {feedbackBanner.message}
                  </div>
                )}

                {state.humanFeedback && state.humanFeedback.length > 0 && (
                  <details style={{ marginTop: 10, fontSize: 11, color: '#9aa0a6' }}>
                    <summary style={{ cursor: 'pointer' }}>
                      History ({state.humanFeedback.length})
                    </summary>
                    <ol
                      style={{
                        margin: '8px 0 0 0',
                        paddingLeft: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}
                    >
                      {state.humanFeedback.map((entry, i) => (
                        <li key={i} style={{ marginBottom: 0 }}>
                          <div style={{ color: '#7c8088', marginBottom: 2 }}>
                            {formatRelative(entry.addedAt)} (after iter {entry.iterationAtTime})
                          </div>
                          <div style={{ color: '#bfc3c8', whiteSpace: 'pre-wrap' }}>{entry.text}</div>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </div>

              {state.iterations.map((iter) => (
                <IterationBlock key={iter.iteration} iteration={iter} defaultOpen={iter === bestIter} />
              ))}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
