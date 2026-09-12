import { useId, useState } from 'react';

const projects = [
  {
    label: 'Next.js + Postgres',
    app: 'Public endpoint',
    service: 'Next.js app',
    database: 'PostgreSQL',
    file: 'web/',
    color: '#a994f5',
    dbColor: '#89a7ed',
    code: [
      'resources:',
      '  web:',
      '    type: nextjs-web',
      '    properties:',
      '      appDirectory: ./web',
      '      connectTo: [database]',
      '',
      '  database:',
      '    type: relational-database',
      '    properties:',
      '      engine:',
      '        type: postgres',
      '      accessibility:',
      '        accessibilityMode: vpc'
    ]
  },
  {
    label: 'Serverless API',
    app: 'HTTP API',
    service: 'Lambda function',
    database: 'DynamoDB',
    file: 'src/api.ts',
    color: '#e8ad74',
    dbColor: '#89a7ed',
    code: [
      'resources:',
      '  api:',
      '    type: http-api-gateway',
      '  handler:',
      '    type: function',
      '    properties:',
      '      connectTo: [orders]',
      '      packaging:',
      '        type: stacktape-lambda-buildpack',
      '        properties:',
      '          entryfilePath: ./src/api.ts',
      '  orders:',
      '    type: dynamo-db-table',
      '    # Table settings generated below'
    ]
  },
  {
    label: 'Container + Redis',
    app: 'Load balancer',
    service: 'Container API',
    database: 'Redis',
    file: 'Dockerfile',
    color: '#e8ad74',
    dbColor: '#df9baa',
    code: [
      'resources:',
      '  api:',
      '    type: web-service',
      '    properties:',
      '      resources:',
      '        cpu: 0.5',
      '        memory: 1024',
      '      connectTo: [cache]',
      '',
      '  cache:',
      '    type: redis-cluster',
      '    properties:',
      '      engine:',
      '        type: redis7'
    ]
  }
] as const;

export function Architecture({ compact = false }: { compact?: boolean }) {
  const id = useId();
  const [projectIndex, setProjectIndex] = useState(0);
  const [split, setSplit] = useState(45);
  const project = projects[projectIndex]!;

  return (
    <div className={`architecture ${compact ? 'architecture-compact' : ''}`}>
      <div className="architecture-picker" aria-label="Example application">
        {projects.map((p, i) => (
          <button type="button" key={p.label} aria-pressed={i === projectIndex} onClick={() => setProjectIndex(i)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="architecture-top">
        <span>
          <span className="tiny-mark">✦</span> Infrastructure generated from your repository
        </span>
        <span className="ui-badge neutral">Ready to review</span>
      </div>
      <div className="architecture-split" style={{ gridTemplateColumns: `${split}% 1fr` }}>
        <div className="architecture-code">
          <div className="code-title">
            <span>stacktape.yml</span>
            <span>Generated · excerpt</span>
          </div>
          <pre aria-label={`Generated configuration excerpt for ${project.label}`}>
            <code>
              {project.code.map((line, i) => (
                // Lines are a static, stateless rendering of a source file; position is their identity.
                // oxlint-disable-next-line react/no-array-index-key
                <span className="code-line" key={i}>
                  <span className="line-number" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className={line.includes('type:') ? 'syntax-type' : line.includes('#') ? 'syntax-comment' : ''}>
                    {line}
                  </span>
                  {'\n'}
                </span>
              ))}
            </code>
          </pre>
        </div>
        <div className="architecture-map">
          <div className="map-label">
            <span>Your AWS account</span>
            <span>eu-west-1</span>
          </div>
          <svg viewBox="0 0 470 330" aria-labelledby={`${id}-title`}>
            <title id={`${id}-title`}>
              {`${project.app} connects to ${project.service} and ${project.database} in your AWS account.`}
            </title>
            <defs>
              <pattern id={`${id}-grid`} width="44" height="25.4" patternUnits="userSpaceOnUse">
                <path d="M0 12.7 22 0 44 12.7 22 25.4Z" stroke="#a9c4c4" strokeOpacity=".09" fill="none" />
              </pattern>
            </defs>
            <rect width="470" height="330" fill={`url(#${id}-grid)`} />
            <path
              d="M42 176 224 70 427 187 245 292Z"
              fill="#779da0"
              fillOpacity=".045"
              stroke="#637c7d"
              strokeOpacity=".4"
              strokeDasharray="4 5"
            />
            <path d="M124 148 235 213 347 148" fill="none" stroke="#658382" strokeWidth="1.5" />
            <path d="M235 213v40" stroke="#658382" strokeWidth="1.5" />
            {[
              { x: 124, y: 143, name: project.app, color: project.color, symbol: '↗' },
              { x: 235, y: 207, name: project.service, color: '#77c5c1', symbol: projectIndex === 1 ? 'λ' : projectIndex === 0 ? 'N' : '□' },
              { x: 347, y: 143, name: project.database, color: project.dbColor, symbol: '▤' }
            ].map((n) => (
              <g key={n.name}>
                <path
                  d={`M${n.x - 42} ${n.y}l42 24 42-24v10l-42 24-42-24Z`}
                  fill="#1b2426"
                  stroke="#526365"
                  strokeWidth=".7"
                />
                <path d={`M${n.x - 42} ${n.y}l42-24 42 24-42 24Z`} fill="#2a383b" stroke={n.color} strokeOpacity=".5" />
                <text x={n.x} y={n.y + 5} textAnchor="middle" fill={n.color} fontSize="25" fontFamily="system-ui">
                  {n.symbol}
                </text>
                <text x={n.x} y={n.y - 43} textAnchor="middle" fill="#e2e9e8" fontSize="12" fontFamily="system-ui">
                  {n.name}
                </text>
              </g>
            ))}
            <text x="245" y="280" textAnchor="middle" fill="#9dacab" fontSize="11" fontFamily="system-ui">
              Private networking · scoped permissions
            </text>
          </svg>
          <p className="map-caption">Connected, secured, and ready to deploy.</p>
        </div>
      </div>
      <div className="architecture-bottom">
        <span>Configuration</span>
        <input
          type="range"
          aria-label="Resize configuration and architecture diagram"
          min="28"
          max="65"
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
        />
        <span>Architecture</span>
      </div>
    </div>
  );
}
