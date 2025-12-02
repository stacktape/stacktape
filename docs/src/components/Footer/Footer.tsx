import { onMaxW720 } from '@/styles/responsive';
import config from '../../../config';

export function Footer() {
  return (
    <footer>
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          maxWidth: '570px',
          justifyContent: 'center',
          gap: '40px',
          margin: '12px auto 12px auto',
          [onMaxW720]: {
            margin: '10px auto 10px auto'
          }
        }}
      >
        <p css={{ textAlign: 'center', [onMaxW720]: { display: 'none' } }}>{config.metadata.copyright}</p>
        <a href="https://status.stacktape.com" target="_blank" rel="noopener noreferrer">
          <div css={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div
              css={{
                width: '8px',
                height: '8px',
                backgroundColor: '#22c55e',
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': {
                    opacity: 0.75,
                    transform: 'scale(1)'
                  },
                  '50%': {
                    opacity: 1,
                    transform: 'scale(1.35)'
                  },
                  '100%': {
                    opacity: 0.75,
                    transform: 'scale(1)'
                  }
                }
              }}
            />
            <p>System status</p>
          </div>
        </a>
        <a href="mailto:info@stacktape.com" target="_blank" rel="noopener noreferrer">
          <p
            css={{
              textAlign: 'center'
            }}
          >
            info@stacktape.com
          </p>
        </a>
      </div>
      <p css={{ display: 'none', marginBottom: '20px', textAlign: 'center', [onMaxW720]: { display: 'block' } }}>
        {config.metadata.copyright}
      </p>
    </footer>
  );
}
