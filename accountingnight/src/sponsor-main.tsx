import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SponsorApp } from './sponsor/SponsorApp';
import './styles/global.css';
import './sponsor/sponsor.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <SponsorApp />
  </StrictMode>,
);
