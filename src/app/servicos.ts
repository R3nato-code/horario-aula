import type { Servicos } from '@/services/contratos';
import { AutenticacaoDemo } from '@/services/demo/autenticacaoDemo';
import { EscolaDemo } from '@/services/demo/escolaDemo';
import { firebaseConfigurado } from '@/lib/firebase/cliente';
import { AutenticacaoFirebase } from '@/services/firebase/autenticacaoFirebase';
import { EscolaFirebase } from '@/services/firebase/escolaFirebase';

let instancia: Servicos | null = null;

export function obterServicos(): Servicos {
  if (instancia) return instancia;

  const modoSolicitado = import.meta.env.VITE_DATA_MODE === 'firebase' ? 'firebase' : 'demo';

  if (modoSolicitado === 'firebase' && firebaseConfigurado) {
    instancia = {
      modo: 'firebase',
      avisoConfiguracao: null,
      auth: new AutenticacaoFirebase(),
      escola: new EscolaFirebase(),
    };
    return instancia;
  }

  instancia = {
    modo: 'demo',
    avisoConfiguracao:
      modoSolicitado === 'firebase'
        ? 'Não foi possível conectar ao serviço de dados. A aplicação está exibindo dados de demonstração.'
        : null,
    auth: new AutenticacaoDemo(),
    escola: new EscolaDemo(),
  };
  return instancia;
}
