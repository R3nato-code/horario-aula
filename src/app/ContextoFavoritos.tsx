import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Favorito } from '@/types/dominio';
import { mensagemDoErro } from '@/services/erros';
import { useServicos } from '@/app/ContextoServicos';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { useToast } from '@/app/ContextoToast';

interface ContextoFavoritosValor {
  favoritos: Favorito[];
  carregando: boolean;
  erro: string | null;
  ehFavorita: (turmaId: string) => boolean;
  alternar: (turmaId: string) => Promise<void>;
  recarregar: () => void;
}

const ContextoFavoritos = createContext<ContextoFavoritosValor | null>(null);

export function ProvedorFavoritos({ children }: { children: ReactNode }) {
  const { escola } = useServicos();
  const { usuario } = useAutenticacao();
  const { notificar } = useToast();
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  // Este provedor só é montado quando há usuário autenticado (ver App), por
  // isso não há ramo de limpeza síncrona quando a sessão termina: o
  // componente é desmontado e o estado é descartado.
  useEffect(() => {
    if (!usuario) return;
    let ativo = true;
    escola
      .listarFavoritos(usuario.uid)
      .then((lista) => {
        if (!ativo) return;
        setFavoritos(lista);
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

  const ehFavorita = useCallback(
    (turmaId: string) => favoritos.some((favorito) => favorito.turmaId === turmaId),
    [favoritos],
  );

  const alternar = useCallback(
    async (turmaId: string) => {
      if (!usuario) return;
      const anterior = favoritos;
      const jaFavorita = anterior.some((favorito) => favorito.turmaId === turmaId);
      setFavoritos(
        jaFavorita
          ? anterior.filter((favorito) => favorito.turmaId !== turmaId)
          : [...anterior, { uid: usuario.uid, turmaId, criadoEm: new Date().toISOString() }],
      );

      try {
        const atualizados = await escola.alternarFavorito(usuario.uid, turmaId);
        setFavoritos(atualizados);
        notificar(
          'sucesso',
          jaFavorita ? 'Turma removida dos favoritos.' : 'Turma adicionada aos favoritos.',
        );
      } catch (falha) {
        setFavoritos(anterior);
        notificar('erro', mensagemDoErro(falha));
      }
    },
    [escola, favoritos, notificar, usuario],
  );

  const recarregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    setVersao((atual) => atual + 1);
  }, []);

  const valor = useMemo<ContextoFavoritosValor>(
    () => ({
      favoritos,
      carregando,
      erro,
      ehFavorita,
      alternar,
      recarregar,
    }),
    [favoritos, carregando, erro, ehFavorita, alternar, recarregar],
  );

  return <ContextoFavoritos.Provider value={valor}>{children}</ContextoFavoritos.Provider>;
}

export function useFavoritos(): ContextoFavoritosValor {
  const contexto = useContext(ContextoFavoritos);
  if (!contexto) {
    throw new Error('useFavoritos deve ser usado dentro de ProvedorFavoritos.');
  }
  return contexto;
}
