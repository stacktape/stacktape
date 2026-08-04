import { useState } from 'react';
import './App.css';

const App = () => {
  const [count, setCount] = useState(0);

  // Environment variables injected by Stacktape at deploy time.
  // Add environment variables in stacktape.yml under hosting-bucket.environment
  // and access them via window.STP_INJECTED_ENV
  const injectedEnv = (window as any).STP_INJECTED_ENV || {};

  return (
    <div className="app">
      <h1>React + Vite</h1>
      <p>Deployed to AWS with Stacktape (S3 + CloudFront CDN)</p>
      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>
      </div>
      {Object.keys(injectedEnv).length > 0 && (
        <div className="card">
          <h3>Injected Environment</h3>
          <pre>{JSON.stringify(injectedEnv, null, 2)}</pre>
        </div>
      )}
      <p className="hint">
        Edit <code>src/App.tsx</code> and deploy to see changes.
      </p>
    </div>
  );
};

export default App;
