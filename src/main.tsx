import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import './theme.css';
import './styles.css';
import './game.css';
import './city.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Sem transições: a troca de página não pode esperar o mapa animado (60 quadros/s) ficar ocioso. */}
    <BrowserRouter useTransitions={false}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
