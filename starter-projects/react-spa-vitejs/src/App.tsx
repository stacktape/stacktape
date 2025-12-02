import { useState } from 'react';
import './App.css';
import reactLogoImage from './react-logo.svg';
import stacktapeLogoImage from './stacktape-logo.svg';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <img src={reactLogoImage} className="App-logo" alt="logo" />
        <p>Hello Vite + React!</p>
        <p>
          <button type="button" onClick={() => setCount(count + 1)}>
            count is: {count}
          </button>
        </p>
        <p>
          Edit <code>App.tsx</code> and save to test HMR updates.
        </p>
        <p>
          <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
            Learn React
          </a>
          {' | '}
          <a
            className="App-link"
            href="https://vitejs.dev/guide/features.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vite Docs
          </a>
        </p>
      </header>
      <footer
        style={{
          width: '100%',
          height: '100px',
          paddingTop: '40px',
          fontSize: '22px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <a
          href="https://stacktape.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexGrow: 1,
            textDecoration: 'none',
            color: '#eaeaea'
          }}
        >
          Deployed using
          <img
            style={{
              width: '40px',
              height: '40px',
              marginLeft: '0.2rem',
              fontWeight: 'bold'
            }}
            src={stacktapeLogoImage}
            alt="Stacktape Logo"
          />
          Stacktape
        </a>
      </footer>
    </div>
  );
}

export default App;
