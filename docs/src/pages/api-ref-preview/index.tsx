import Link from 'next/link';
import { colors } from '@/styles/variables';

export default function ApiRefPreviewIndex() {
  return (
    <div
      css={{
        minHeight: '100vh',
        background: colors.backgroundColor,
        color: colors.fontColorPrimary,
        padding: '40px 24px',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div css={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 css={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>API Reference design preview</h1>
        <p css={{ color: 'rgba(255, 255, 255, 0.62)', marginBottom: '32px', lineHeight: 1.6 }}>
          Tree nav left, schema-as-code right (rendered via the standard{' '}
          <code css={{ background: 'rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: '4px' }}>
            &lt;CodeBlockNew /&gt;
          </code>{' '}
          for proper Shiki highlighting). Discriminated-union branches AND nested type-properties references are
          first-class navigation children. Type names are kept verbatim (PascalCase). Try <code>WebServiceProps</code>{' '}
          for big unions (<code>packaging</code>, <code>loadBalancing</code>) and <code>RelationalDatabaseProps</code>{' '}
          for nested unions (<code>engine</code> → branch → <code>instances[]</code> → <code>AuroraEngineInstance</code>
          ).
        </p>
        <Link
          href="/api-ref-preview/v1"
          css={{
            display: 'block',
            padding: '18px 20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            background: 'rgba(34, 40, 40, 0.6)',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'border-color 120ms ease, background 120ms ease',
            ':hover': { borderColor: 'rgba(54, 190, 190, 0.4)', background: 'rgba(54, 190, 190, 0.06)' }
          }}
        >
          <div css={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', color: colors.brandGreen }}>
            V1 — Tree nav + schema-as-code
          </div>
          <div css={{ color: 'rgba(255, 255, 255, 0.78)', fontSize: '14px', lineHeight: 1.55 }}>Open the preview →</div>
        </Link>
      </div>
    </div>
  );
}
