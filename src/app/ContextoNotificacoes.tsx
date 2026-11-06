import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Notificacao } from '@/types/dominio';
import { mensagemDoErro } from '@/services/erros';
import { useServicos } from '@/app/ContextoServicos';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { useToast } from '@/app/ContextoToast';

interface ContextoNotificacoesValor {
  notificacoes: Notificacao[];
  naoLidas: number;
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
  marcarLida: (id: string) => Promise<void>;
  marcarTodasLidas: () => Promise<void>;
}

const ContextoNotificacoes = createContext<ContextoNotificacoesValor | null>(null);

export function ProvedorNotificacoes({ children }: { children: ReactNode }) {
  const { escola } = useServicos();
  const { usuario } = useAutenticacao();
  const { notificar } = useToast();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  // Montado apenas com usuário autenticado (ver App); a troca de sessão
  // desmonta o provedor e descarta o estado.
  useEffect(() => {
    if (!usuario) return;
    let ativo = true;
    escola
      .listarNotificacoes(usuario.uid)
      .then((lista) => {
        if (!ativo) return;
        setNotificacoes(lista);
      })
      .catch((falha: unknown) => {
        if (!ativo) return;
        setErro(mensagemDoErro(falha));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [escola, usuario, versao]);

  const marcarLida = useCallback(
    async (id: string) => {
      if (!usuario) return;
      const anterior = notificacoes;
      setNotificacoes((atuais) =>
        atuais.map((notificacao) =>
          notificacao.id === id ? { ...notificacao, lida: true } : notificacao,
        ),
      );
      try {
        await escola.marcarNotificacaoLida(usuario.uid, id);
      } catch (falha) {
        setNotificacoes(anterior);
        notificar('erro', mensagemDoErro(falha));
      }
    },
    [escola, notificacoes, notificar, usuario],
  );

  const marcarTodasLidas = useCallback(async () => {
    if (!usuario) return;
    const anterior = notificacoes;
    setNotificacoes((atuais) => atuais.map((item) => ({ ...item, lida: true })));
    try {
      await escola.marcarTodasNotificacoesLidas(usuario.uid);
      notificar('sucesso', 'Todas as notificações foram marcadas como lidas.');
    } catch (falha) {
      setNotificacoes(anterior);
      notificar('erro', mensagemDoErro(falha));
    }
  }, [escola, notificacoes, notificar, usuario]);

  const recarregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    setVersao((atual) => atual + 1);
  }, []);

  const valor = useMemo<ContextoNotificacoesValor>(
    () => ({
      notificacoes,
      naoLidas: notificacoes.filter((item) => !item.lida).length,
      carregando,
      erro,
      recarregar,
      marcarLida,
      marcarTodasLidas,
    }),
    [notificacoes, carregando, erro, recarregar, marcarLida, marcarTodasLidas],
  );

  return (
    <ContextoNotificacoes.Provider value={valor}>{children}</ContextoNotificacoes.Provider>
  );
}

export function useNotificacoes(): ContextoNotificacoesValor {
  const contexto = useContext(ContextoNotificacoes);
  if (!contexto) {
    throw new Error('useNotificacoes deve ser usado dentro de ProvedorNotificacoes.');
  }
  return contexto;
}
