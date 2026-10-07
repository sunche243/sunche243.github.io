import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StudentApp } from './student/StudentApp';
import './styles/global.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <StudentApp />
  </StrictMode>,
);
