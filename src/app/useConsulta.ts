import { useCallback, useEffect, useRef, useState } from 'react';
import { mensagemDoErro } from '@/services/erros';

interface EstadoConsulta<T> {
  dados: T | null;
  carregando: boolean;
  erro: string | null;
}

interface Resultado<T> {
  chave: string;
  versao: number;
  dados: T | null;
  erro: string | null;
}

/**
 * Executa uma consulta assíncrona e expõe carregamento, erro e recarga.
 * "chave" deve representar os filtros que exigem nova consulta.
 *
 * O estado de carregamento é derivado da comparação entre a chave/versão
 * solicitada e o resultado efetivamente armazenado, evitando setState
 * síncrono dentro do efeito.
 */
export function useConsulta<T>(
  carregar: () => Promise<T>,
  chave: string,
): EstadoConsulta<T> & { recarregar: () => void } {
  const [versao, setVersao] = useState(0);
  const [resultado, setResultado] = useState<Resultado<T>>({
    chave,
    versao: -1,
    dados: null,
    erro: null,
  });
  const carregarRef = useRef(carregar);

  // Mantém a função mais recente sem incluí-la nas dependências do efeito de
  // busca (as páginas costumam passar closures inline, que mudam a cada render).
  useEffect(() => {
    carregarRef.current = carregar;
  });

  useEffect(() => {
    let ativo = true;
    carregarRef
      .current()
      .then((dados) => {
        if (!ativo) return;
        setResultado({ chave, versao, dados, erro: null });
      })
      .catch((falha: unknown) => {
        if (!ativo) return;
        setResultado((anterior) => ({
          chave,
          versao,
          dados: anterior.chave === chave ? anterior.dados : null,
          erro: mensagemDoErro(falha),
        }));
      });
    return () => {
      ativo = false;
    };
  }, [chave, versao]);

  const pendente = resultado.chave !== chave || resultado.versao !== versao;
  const recarregar = useCallback(() => setVersao((atual) => atual + 1), []);

  return {
    dados: resultado.chave === chave ? resultado.dados : null,
    carregando: pendente,
    erro: pendente ? null : resultado.erro,
    recarregar,
  };
}
