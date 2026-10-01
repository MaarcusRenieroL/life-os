import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

import '@/index.css';

import { HudGallery } from './hud-gallery';

// Entry for hud-preview.html: mounts the mock-data pages with no auth and no backend, so the look
// can be reviewed (and screenshotted) in isolation. Not part of the production build.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter>
      <HudGallery />
    </MemoryRouter>
  </StrictMode>,
);
