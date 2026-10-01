import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AttendanceApp } from './attendance/AttendanceApp';
import './styles/global.css';
import './sponsor/sponsor.css';
import './attendance/attendance.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AttendanceApp />
  </StrictMode>,
);
