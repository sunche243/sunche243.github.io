import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TableApp } from './TableApp';
import './table.css';

document.body.classList.add('table-page');

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode><TableApp /></StrictMode>,
);
