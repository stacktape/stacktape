import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Before the application, and it has to be: `styles.css` declares the order of the cascade layers,
// and a layer's rank is fixed by where it is first named. Components import stylesheets of their own
// (the config editor, the diagram) that open the shared `stacktape-ui` layer; if one of those came
// first in the bundle, that layer would rank below Tailwind's reset and every shared control would
// lose its padding and corners.
import './styles.css';
import { App } from './App';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('The wizard has nowhere to mount.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
