import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './app';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
