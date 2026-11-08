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
        ? 'O modo Firebase foi solicitado, mas a configuração pública está incompleta. A aplicação foi iniciada com dados locais de demonstração.'
        : null,
    auth: new AutenticacaoDemo(),
    escola: new EscolaDemo(),
  };
  return instancia;
}
