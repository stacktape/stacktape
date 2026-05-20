import Head from 'next/head';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GenerationSummary } from './api/generation/list';

// Polling interval for the dashboard. Every 5s feels live without hammering the API.
const REFRESH_MS = 5_000;

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
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatRelative = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86400_000) return `${Math.round(ms / 3600_000)}h ago`;
  return `${Math.round(ms / 86400_000)}d ago`;
};

const STATUS_COLOR: Record<GenerationSummary['status'], string> = {
  passed: '#3eb55a',
  'needs-human-review': '#f7a738',
  'in-progress': '#3b82f6',
  failed: '#e25a4d',
  unknown: '#9aa0a6'
};

// ─── Status pill ────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: GenerationSummary['status'] }) {
  const color = STATUS_COLOR[status];
  const isLive = status === 'in-progress';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: '#fff',
        background: color,
        ...(isLive ? { animation: 'pulse 1.5s infinite' } : {})
      }}
    >
      {isLive && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
      {status}
    </span>
  );
}

// ─── Detail panel (right column) ────────────────────────────────────────────

function ReviewerCard({ result }: { result: ReviewerResult }) {
  const avg = (Object.values(result.scores).reduce((a, b) => a + b, 0) / Object.values(result.scores).length).toFixed(2);
  return (
    <div style={{ background: '#1c1f24', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>{result.reviewerId}</strong>
        <span style={{ fontSize: 11, color: '#9aa0a6' }}>
          ({result.modelProvider}{result.modelName ? `, ${result.modelName}` : ''})
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
    </div>
  );
}

function VerifierCard({ result }: { result: VerifierResult }) {
  const high = result.issues.filter((i) => i.severity === 'high').length;
  const medium = result.issues.filter((i) => i.severity === 'medium').length;
  const low = result.issues.filter((i) => i.severity === 'low').length;
  return (
    <div style={{ background: '#1c1f24', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>{result.verifierId}</strong>
        <span style={{ fontSize: 11, color: '#9aa0a6' }}>
          ({result.modelProvider}{result.modelName ? `, ${result.modelName}` : ''})
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
          {result.issues.map((issue, i) => (
            <li key={i} style={{ background: '#2a2e35', borderRadius: 6, padding: 8, marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    padding: '1px 5px',
                    borderRadius: 3,
                    background:
                      issue.severity === 'high' ? '#7a2826' : issue.severity === 'medium' ? '#6b4d18' : '#3a3d44',
                    color: '#fff'
                  }}
                >
                  {issue.severity}
                </span>
                <span style={{ fontSize: 11, color: '#9aa0a6' }}>{issue.type}</span>
              </div>
              <div style={{ color: '#d1d5db', marginBottom: 4 }}>{issue.statement}</div>
              <div style={{ color: '#9aa0a6', fontSize: 11 }}>Fix: {issue.suggestedFix}</div>
              {issue.evidence && issue.evidence.length > 0 && (
                <div style={{ color: '#7c8088', fontSize: 11, marginTop: 4 }}>
                  Evidence: <code>{issue.evidence[0].file}</code>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IterationBlock({ iteration }: { iteration: IterationResult }) {
  const reviewerAvg =
    iteration.reviewerResults.length > 0
      ? (
          iteration.reviewerResults
            .flatMap((r) => Object.values(r.scores))
            .reduce((a, b) => a + b, 0) /
          (iteration.reviewerResults.length * 5)
        ).toFixed(2)
      : 'n/a';
  const status = iteration.status || (iteration.passed ? 'passed' : 'failed');
  const statusColor = status === 'passed' ? '#3eb55a' : status === 'needs-human-review' ? '#f7a738' : '#e25a4d';
  return (
    <details open={!iteration.passed} style={{ marginBottom: 16 }}>
      <summary style={{ cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid #2a2e35' }}>
        <strong>Iteration {iteration.iteration}</strong>{' '}
        <span style={{ color: statusColor, marginLeft: 8, fontSize: 12 }}>
          {status}
        </span>
        <span style={{ marginLeft: 8, color: '#9aa0a6', fontSize: 12 }}>reviewer avg {reviewerAvg}</span>
      </summary>
      <div style={{ marginTop: 12 }}>
        <h4 style={{ fontSize: 12, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>
          Reviewers
        </h4>
        {iteration.reviewerResults.map((r) => (
          <ReviewerCard key={r.reviewerId} result={r} />
        ))}
        <h4 style={{ fontSize: 12, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: 0.5, margin: '12px 0 8px' }}>
          Verifiers
        </h4>
        {iteration.verifierResults.map((v) => (
          <VerifierCard key={v.verifierId} result={v} />
        ))}
      </div>
    </details>
  );
}

function DetailPanel({ pageId, onClose }: { pageId: string; onClose: () => void }) {
  const [state, setState] = useState<PipelineState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    const t = setInterval(fetchState, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pageId]);

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 'min(720px, 60vw)',
        height: '100vh',
        background: '#121417',
        borderLeft: '1px solid #2a2e35',
        overflowY: 'auto',
        padding: 24,
        boxShadow: '-12px 0 32px rgba(0,0,0,0.4)',
        zIndex: 100
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, flex: 1 }}>{state ? `/${state.pageRoute}` : pageId}</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid #3a3d44',
            color: '#d1d5db',
            padding: '4px 10px',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
      {loading && !state && <div style={{ color: '#9aa0a6' }}>Loading…</div>}
      {error && <div style={{ color: '#e25a4d' }}>Error: {error}</div>}
      {state && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12, color: '#9aa0a6' }}>
            <div>started {formatRelative(state.startedAt)}</div>
            <div>updated {formatRelative(state.updatedAt)}</div>
            {state.completedAt && <div style={{ color: '#3eb55a' }}>completed {formatRelative(state.completedAt)}</div>}
          </div>
          {state.finalOutputPath && (
            <div style={{ marginBottom: 16 }}>
              <a
                href={`/${state.pageRoute}`}
                style={{ color: '#7eb6ff', fontSize: 13 }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open rendered page →
              </a>
            </div>
          )}
          {state.agentModelAssignments && (
            <details style={{ marginBottom: 16, fontSize: 12, color: '#9aa0a6' }}>
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
          {state.pipelineFailureSummary && (
            <div
              style={{
                background: '#3b1f1d',
                color: '#f0c3bf',
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                marginBottom: 16
              }}
            >
              <strong>did-not-pass:</strong> {state.pipelineFailureSummary}
            </div>
          )}
          {state.pipelineReviewSummary && (
            <div
              style={{
                background: '#3a2a13',
                color: '#f7d89a',
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                marginBottom: 16
              }}
            >
              <strong>needs-human-review:</strong> {state.pipelineReviewSummary}
            </div>
          )}
          {state.iterations.map((iter) => (
            <IterationBlock key={iter.iteration} iteration={iter} />
          ))}
        </>
      )}
    </aside>
  );
}

// ─── List view ──────────────────────────────────────────────────────────────

export default function GenerationDashboard() {
  const [pages, setPages] = useState<GenerationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<GenerationSummary['status'] | 'all'>('all');

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch('/api/generation/list');
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setPages(json.pages);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
    const t = setInterval(fetchList, REFRESH_MS);
    return () => clearInterval(t);
  }, [fetchList]);

  const filtered = useMemo(() => {
    const f = filter.toLowerCase().trim();
    return pages.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (f && !p.pageRoute.toLowerCase().includes(f)) return false;
      return true;
    });
  }, [pages, filter, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: pages.length,
      passed: 0,
      'needs-human-review': 0,
      'in-progress': 0,
      failed: 0,
      unknown: 0
    };
    for (const p of pages) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [pages]);

  return (
    <>
      <Head>
        <title>Docs Generation — Stacktape</title>
        <meta name="robots" content="noindex" />
      </Head>
      <style jsx global>{`
        body {
          background: #0e1013;
          color: #e6e8ea;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #1c1f24; font-size: 13px; }
        th { color: #9aa0a6; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
        tr:hover td { background: #1a1d22; cursor: pointer; }
      `}</style>
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Docs Generation</h1>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', fontSize: 12, color: '#9aa0a6' }}>
            <span>auto-refresh {REFRESH_MS / 1000}s</span>
            {error && <span style={{ color: '#e25a4d' }}>error: {error}</span>}
          </div>
        </header>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['all', 'in-progress', 'passed', 'needs-human-review', 'failed', 'unknown'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                background: statusFilter === s ? '#2a2e35' : 'transparent',
                color: '#e6e8ea',
                border: '1px solid #2a2e35',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              {s} ({counts[s] || 0})
            </button>
          ))}
          <input
            type="text"
            placeholder="Filter by route..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              background: '#1c1f24',
              border: '1px solid #2a2e35',
              color: '#e6e8ea',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12
            }}
          />
        </div>

        {loading && pages.length === 0 && <div style={{ color: '#9aa0a6' }}>Loading…</div>}

        {pages.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Status</th>
                <th>Iters</th>
                <th>Reviewer avg</th>
                <th>Hard</th>
                <th>Advisory high</th>
                <th>Medium</th>
                <th>Last update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.pageId} onClick={() => setSelectedPageId(p.pageId)}>
                  <td style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>/{p.pageRoute}</td>
                  <td>
                    <StatusPill status={p.status} />
                  </td>
                  <td>{p.iterationCount}</td>
                  <td>{p.reviewerAvg ?? '—'}</td>
                  <td style={{ color: p.hardIssues > 0 ? '#e25a4d' : '#9aa0a6' }}>{p.hardIssues}</td>
                  <td style={{ color: p.advisoryHighIssues > 0 ? '#f7a738' : '#9aa0a6' }}>{p.advisoryHighIssues}</td>
                  <td style={{ color: p.mediumIssues > 0 ? '#f7a738' : '#9aa0a6' }}>{p.mediumIssues}</td>
                  <td style={{ color: '#9aa0a6', fontSize: 12 }}>{formatRelative(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pages.length === 0 && !loading && (
          <div style={{ color: '#9aa0a6', padding: 32, textAlign: 'center' }}>
            No generation state yet. Run <code>bun run scripts/generate-docs/generate-pages.ts --onlyPage &lt;route&gt;</code> to start.
          </div>
        )}
      </div>

      {selectedPageId && <DetailPanel pageId={selectedPageId} onClose={() => setSelectedPageId(null)} />}
    </>
  );
}
