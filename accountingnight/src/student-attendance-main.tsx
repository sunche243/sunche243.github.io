import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StudentAttendanceApp } from './student/StudentAttendanceApp';
import './styles/global.css';
import './sponsor/sponsor.css';
import './attendance/attendance.css';
import './student/student.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <StudentAttendanceApp />
  </StrictMode>,
);
