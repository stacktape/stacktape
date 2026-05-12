import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { colors } from '@/styles/variables';

const POPULAR_DEFINITIONS = [
  'WebServiceProps',
  'LambdaFunctionProps',
  'ContainerWorkloadProps',
  'PrivateServiceProps',
  'WorkerServiceProps',
  'BatchJobProps',
  'EdgeLambdaFunctionProps',
  'RelationalDatabaseProps',
  'DynamoDbTableProps',
  'RedisClusterProps',
  'BucketProps',
  'HttpApiGatewayProps',
  'ApplicationLoadBalancerProps',
  'StateMachineProps',
  'UserAuthPoolProps',
  'EventBusProps',
  'SqsQueueProps',
  'SnsTopicProps',
  'NextjsWebProps'
];

const NAV = [{ slug: 'v1', label: 'V1 · Schema-as-code' }];

export function PreviewShell({
  active,
  title,
  blurb,
  render
}: {
  active: string;
  title: string;
  blurb: string;
  render: (definitionName: string) => ReactNode;
}) {
  const [definitionName, setDefinitionName] = useState('WebServiceProps');

  return (
    <div
      css={{
        minHeight: '100vh',
        background: colors.backgroundColor,
        color: colors.fontColorPrimary,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        padding: '24px 18px 80px'
      }}
    >
      <div css={{ maxWidth: '1080px', margin: '0 auto' }}>
        <div css={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <Link
            href="/api-ref-preview"
            css={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12.5px',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '4px 10px',
              borderRadius: '5px',
              ':hover': { color: colors.brandGreen, borderColor: 'rgba(54, 190, 190, 0.4)' }
            }}
          >
            ← All variants
          </Link>
          <div css={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {NAV.map((nav) => (
              <Link
                key={nav.slug}
                href={`/api-ref-preview/${nav.slug}`}
                css={{
                  padding: '4px 10px',
                  borderRadius: '5px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  border: `1px solid ${nav.slug === active ? 'rgba(54, 190, 190, 0.5)' : 'rgba(255,255,255,0.1)'}`,
                  background: nav.slug === active ? 'rgba(54, 190, 190, 0.12)' : 'transparent',
                  color: nav.slug === active ? colors.brandGreen : 'rgba(255,255,255,0.6)'
                }}
              >
                {nav.label}
              </Link>
            ))}
          </div>
        </div>
        <h1 css={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>{title}</h1>
        <p css={{ color: 'rgba(255,255,255,0.6)', marginBottom: '20px', fontSize: '13.5px', lineHeight: 1.6 }}>
          {blurb}
        </p>
        <div css={{ marginBottom: '16px' }}>
          <label css={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 700, marginRight: '8px' }}>
            Definition:
          </label>
          <select
            value={definitionName}
            onChange={(event) => setDefinitionName(event.target.value)}
            css={{
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.32)',
              color: '#fff',
              padding: '5px 8px',
              borderRadius: '5px',
              fontSize: '12.5px',
              outline: 'none'
            }}
          >
            {POPULAR_DEFINITIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div key={definitionName}>{render(definitionName)}</div>
      </div>
    </div>
  );
}
