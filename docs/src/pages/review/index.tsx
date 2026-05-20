import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { GenerationSummary } from '../api/generation/list';

const STATUS_COLOR: Record<GenerationSummary['status'], string> = {
  passed: '#3eb55a',
  'needs-human-review': '#f7a738',
  'in-progress': '#3b82f6',
  failed: '#e25a4d',
  unknown: '#9aa0a6'
};

const formatRelative = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86400_000) return `${Math.round(ms / 3600_000)}h ago`;
  return `${Math.round(ms / 86400_000)}d ago`;
};

export default function ReviewIndex() {
  const [pages, setPages] = useState<GenerationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'review-and-failed' | 'needs-human-review' | 'failed' | 'all'>(
    'review-and-failed'
  );
  // Worst-first is the default: send human attention where the model needed it most.
  // Quality formula mirrors run-page.ts getIterationQualityScore: avg − 10×hard − 3×advisoryHigh − medium.
  const [sortMode, setSortMode] = useState<'worst-first' | 'best-first' | 'recent'>('worst-first');

  useEffect(() => {
    let alive = true;
    const fetchList = async () => {
      try {
        const res = await fetch('/api/generation/list');
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (alive) {
          setPages(json.pages);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchList();
    const t = setInterval(fetchList, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const qualityScore = (p: GenerationSummary) => {
    const avg = p.reviewerAvg ?? 0;
    return avg - 10 * p.hardIssues - 3 * p.advisoryHighIssues - p.mediumIssues;
  };

  const filtered = useMemo(() => {
    const f = filter.toLowerCase().trim();
    const filteredList = pages.filter((p) => {
      if (statusFilter === 'review-and-failed' && p.status !== 'needs-human-review' && p.status !== 'failed') return false;
      if (statusFilter === 'needs-human-review' && p.status !== 'needs-human-review') return false;
      if (statusFilter === 'failed' && p.status !== 'failed') return false;
      if (f && !p.pageRoute.toLowerCase().includes(f)) return false;
      return true;
    });
    if (sortMode === 'worst-first') {
      filteredList.sort((a, b) => qualityScore(a) - qualityScore(b));
    } else if (sortMode === 'best-first') {
      filteredList.sort((a, b) => qualityScore(b) - qualityScore(a));
    } else {
      filteredList.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return filteredList;
  }, [pages, filter, statusFilter, sortMode]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: pages.length,
      passed: 0,
      'needs-human-review': 0,
      failed: 0,
      'in-progress': 0,
      unknown: 0
    };
    for (const p of pages) c[p.status] = (c[p.status] || 0) + 1;
    c['review-and-failed'] = (c['needs-human-review'] || 0) + (c.failed || 0);
    return c;
  }, [pages]);

  return (
    <>
      <Head>
        <title>Review — Stacktape Docs</title>
        <meta name="robots" content="noindex" />
      </Head>
      <style jsx global>{`
        body {
          background: #0e1013;
          color: #e6e8ea;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #1c1f24; font-size: 13px; }
        th { color: #9aa0a6; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
        tr:hover td { background: #1a1d22; }
        a { color: inherit; text-decoration: none; }
      `}</style>
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Review queue</h1>
          <span style={{ fontSize: 12, color: '#9aa0a6' }}>
            Pages that need a human glance before publish. Click a row to open the side-by-side review view.
          </span>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9aa0a6' }}>
            <Link href="/generation" style={{ color: '#7eb6ff' }}>/generation dashboard →</Link>
          </div>
        </header>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['review-and-failed', 'needs-human-review', 'failed', 'all'] as const).map((s) => (
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
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
            style={{
              background: '#1c1f24',
              border: '1px solid #2a2e35',
              color: '#e6e8ea',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            <option value="worst-first">Sort: worst first</option>
            <option value="best-first">Sort: best first</option>
            <option value="recent">Sort: most recent</option>
          </select>
        </div>

        {error && <div style={{ color: '#e25a4d', marginBottom: 12 }}>Error: {error}</div>}
        {loading && pages.length === 0 && <div style={{ color: '#9aa0a6' }}>Loading…</div>}

        {filtered.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Status</th>
                <th>Quality</th>
                <th>Iters</th>
                <th>Reviewer avg</th>
                <th>Hard</th>
                <th>Advisory high</th>
                <th>Medium</th>
                <th>Last update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const q = qualityScore(p);
                return (
                  <tr key={p.pageId}>
                    <td style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>
                      <Link href={`/review/${p.pageRoute}`} style={{ color: '#7eb6ff' }}>
                        /{p.pageRoute}
                      </Link>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: 0.4,
                          textTransform: 'uppercase',
                          color: '#fff',
                          background: STATUS_COLOR[p.status]
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ color: q >= 6 ? '#3eb55a' : q >= 0 ? '#f7a738' : '#e25a4d', fontWeight: 600 }}>
                      {q.toFixed(1)}
                    </td>
                    <td>{p.iterationCount}</td>
                    <td>{p.reviewerAvg ?? '—'}</td>
                    <td style={{ color: p.hardIssues > 0 ? '#e25a4d' : '#9aa0a6' }}>{p.hardIssues}</td>
                    <td style={{ color: p.advisoryHighIssues > 0 ? '#f7a738' : '#9aa0a6' }}>{p.advisoryHighIssues}</td>
                    <td style={{ color: p.mediumIssues > 0 ? '#f7a738' : '#9aa0a6' }}>{p.mediumIssues}</td>
                    <td style={{ color: '#9aa0a6', fontSize: 12 }}>{formatRelative(p.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {filtered.length === 0 && !loading && (
          <div style={{ color: '#9aa0a6', padding: 32, textAlign: 'center' }}>No pages match this filter.</div>
        )}
      </div>
    </>
  );
}
