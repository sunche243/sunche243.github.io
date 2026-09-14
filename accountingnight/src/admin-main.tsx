import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminApp } from './admin/AdminApp';
import './styles/global.css';
import './admin/admin.css';

document.body.classList.add('admin-page');

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
