import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('The wizard has nowhere to mount.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
