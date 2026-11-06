import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { ProvedorServicos } from '@/app/ContextoServicos';
import { ProvedorToast } from '@/app/ContextoToast';
import { ProvedorAutenticacao } from '@/app/ContextoAutenticacao';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/components.css';
import '@/styles/layout.css';
import '@/styles/pages.css';

const raiz = document.getElementById('root');

if (!raiz) {
  throw new Error('Elemento raiz não encontrado no documento.');
}

createRoot(raiz).render(
  <StrictMode>
    <ProvedorServicos>
      <ProvedorToast>
        <ProvedorAutenticacao>
          <App />
        </ProvedorAutenticacao>
      </ProvedorToast>
    </ProvedorServicos>
  </StrictMode>,
);
