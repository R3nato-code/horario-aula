import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Papel, Usuario } from '@/types/dominio';
import type {
  CredenciaisEmailSenha,
  DadosCadastroConta,
  OpcoesPersistencia,
} from '@/services/contratos';
import { mensagemDoErro } from '@/services/erros';
import { useServicos } from '@/app/ContextoServicos';

type StatusAutenticacao = 'carregando' | 'autenticado' | 'anonimo' | 'erro';

interface ContextoAutenticacaoValor {
  status: StatusAutenticacao;
  usuario: Usuario | null;
  erro: string | null;
  entrarComGoogle: (opcoes?: OpcoesPersistencia) => Promise<void>;
  entrarComEmailSenha: (
    credenciais: CredenciaisEmailSenha,
    opcoes?: OpcoesPersistencia,
  ) => Promise<void>;
  cadastrarComEmailSenha: (
    dados: DadosCadastroConta,
    opcoes?: OpcoesPersistencia,
  ) => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
  entrarDemonstracao: (papel: Papel) => Promise<void>;
  sair: () => Promise<void>;
  /** Repete a restauração da sessão e recarrega o perfil (`users/{uid}`) diretamente no Firestore. */
  recarregarSessao: () => Promise<void>;
  limparErro: () => void;
}

const ContextoAutenticacao = createContext<ContextoAutenticacaoValor | null>(null);

export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
  const { auth } = useServicos();
  const [status, setStatus] = useState<StatusAutenticacao>('carregando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    auth
      .sessaoAtual()
      .then((sessao) => {
        if (!ativo) return;
        setUsuario(sessao);
        setStatus(sessao ? 'autenticado' : 'anonimo');
      })
      .catch((falha: unknown) => {
        if (!ativo) return;
        setErro(mensagemDoErro(falha));
        setStatus('erro');
      });

    const cancelar = auth.assinar(
      (sessao) => {
        if (!ativo) return;
        setUsuario(sessao);
        setStatus(sessao ? 'autenticado' : 'anonimo');
        // Não apaga um erro de restauração inicial com um evento anônimo:
        // o ouvinte dispara antes de `sessaoAtual` concluir em alguns casos.
        if (sessao) setErro(null);
      },
      (falha) => {
        if (!ativo) return;
        // O usuário continua autenticado no Firebase Auth; o que falhou foi a
        // preparação do perfil. Expor o erro permite nova tentativa explícita.
        setUsuario(null);
        setErro(mensagemDoErro(falha));
        setStatus('erro');
      },
    );

    return () => {
      ativo = false;
      cancelar();
    };
  }, [auth]);

  const recarregarSessao = useCallback(async () => {
    setErro(null);
    setStatus('carregando');

    try {
      const sessao = await auth.sessaoAtual();
      setUsuario(sessao);
      setStatus(sessao ? 'autenticado' : 'anonimo');
    } catch (falha) {
      setUsuario(null);
      setErro(mensagemDoErro(falha));
      setStatus('erro');
    }
  }, [auth]);

  const entrarDemonstracao = useCallback(
    async (papel: Papel) => {
      setErro(null);
      const sessao = await auth.entrarDemonstracao(papel);
      setUsuario(sessao);
      setStatus('autenticado');
    },
    [auth],
  );

  const entrarComGoogle = useCallback(
    async (opcoes?: OpcoesPersistencia) => {
      setErro(null);
      const sessao = await auth.entrarComGoogle(opcoes);
      setUsuario(sessao);
      setStatus('autenticado');
    },
    [auth],
  );

  const entrarComEmailSenha = useCallback(
    async (credenciais: CredenciaisEmailSenha, opcoes?: OpcoesPersistencia) => {
      setErro(null);
      const sessao = await auth.entrarComEmailSenha(credenciais, opcoes);
      setUsuario(sessao);
      setStatus('autenticado');
    },
    [auth],
  );

  const cadastrarComEmailSenha = useCallback(
    async (dados: DadosCadastroConta, opcoes?: OpcoesPersistencia) => {
      setErro(null);
      const sessao = await auth.cadastrarComEmailSenha(dados, opcoes);
      setUsuario(sessao);
      setStatus('autenticado');
    },
    [auth],
  );

  const recuperarSenha = useCallback(
    async (email: string) => {
      setErro(null);
      await auth.recuperarSenha(email);
    },
    [auth],
  );

  const sair = useCallback(async () => {
    await auth.sair();
    setUsuario(null);
    setStatus('anonimo');
    setErro(null);
  }, [auth]);

  const limparErro = useCallback(() => setErro(null), []);

  const valor = useMemo<ContextoAutenticacaoValor>(
    () => ({
      status,
      usuario,
      erro,
      entrarComGoogle,
      entrarComEmailSenha,
      cadastrarComEmailSenha,
      recuperarSenha,
      entrarDemonstracao,
      sair,
      recarregarSessao,
      limparErro,
    }),
    [
      status,
      usuario,
      erro,
      entrarComGoogle,
      entrarComEmailSenha,
      cadastrarComEmailSenha,
      recuperarSenha,
      entrarDemonstracao,
      sair,
      recarregarSessao,
      limparErro,
    ],
  );

  return <ContextoAutenticacao.Provider value={valor}>{children}</ContextoAutenticacao.Provider>;
}

export function useAutenticacao(): ContextoAutenticacaoValor {
  const contexto = useContext(ContextoAutenticacao);
  if (!contexto) {
    throw new Error('useAutenticacao deve ser usado dentro de ProvedorAutenticacao.');
  }
  return contexto;
}
