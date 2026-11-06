import type { ServicoAssistente, Servicos } from '@/services/contratos';
import { AutenticacaoDemo } from '@/services/demo/autenticacaoDemo';
import { EscolaDemo } from '@/services/demo/escolaDemo';
import { firebaseConfigurado } from '@/lib/firebase/cliente';
import { AutenticacaoFirebase } from '@/services/firebase/autenticacaoFirebase';
import { EscolaFirebase } from '@/services/firebase/escolaFirebase';
import { ErroDeServico } from '@/services/erros';

class AssistenteIndisponivel implements ServicoAssistente {
  async perguntar(): Promise<never> {
    throw new ErroDeServico(
      'nao-configurado',
      'O assistente de IA ainda não está conectado neste ambiente.',
      'As consultas devem ser executadas por uma Cloud Function autorizada, com ferramentas restritas aos dados escolares (RF10 e LAC-07).',
    );
  }
}

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
      assistente: new AssistenteIndisponivel(),
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
    assistente: new AssistenteIndisponivel(),
  };
  return instancia;
}
