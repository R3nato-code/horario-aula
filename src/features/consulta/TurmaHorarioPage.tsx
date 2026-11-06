import { useMemo } from 'react';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { SeloStatus } from '@/components/ui/Selos';
import { Icone } from '@/components/Icone';
import { GradeSemanal } from '@/features/horarios/GradeSemanal';
import { useConsulta } from '@/app/useConsulta';
import { useServicos } from '@/app/ContextoServicos';
import { useFavoritos } from '@/app/ContextoFavoritos';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { useTituloPagina } from '@/lib/useTituloPagina';
import { podeAdministrar, ROTULOS_MODALIDADE } from '@/lib/constantes';
import type { AulaDetalhada } from '@/types/dominio';

interface Props {
  turmaId: string;
}

export function TurmaHorarioPage({ turmaId }: Props) {
  const { escola } = useServicos();
  const { usuario } = useAutenticacao();
  const { ehFavorita, alternar, carregando: carregandoFavoritos } = useFavoritos();
  const { dados, carregando, erro, recarregar } = useConsulta(async () => {
    const [catalogo, aulas] = await Promise.all([
      escola.listarCatalogo(),
      escola.listarAulas({ turmaId }),
    ]);
    return { catalogo, aulas };
  }, `turma-${turmaId}`);

  const turma = dados?.catalogo.turmas.find((item) => item.id === turmaId) ?? null;
  useTituloPagina(turma ? `Horário da turma ${turma.nome}` : 'Horário da turma');

  const favorita = turma ? ehFavorita(turma.id) : false;
  const aulas = useMemo<AulaDetalhada[]>(() => dados?.aulas ?? [], [dados]);

  if (carregando && !dados) {
    return (
      <>
        <CabecalhoPagina sobretitulo="Consulta" titulo="Horário da turma" />
        <EstadoCarregando texto="Carregando grade semanal…" />
      </>
    );
  }

  if (erro) {
    return (
      <>
        <CabecalhoPagina sobretitulo="Consulta" titulo="Horário da turma" />
        <EstadoErro texto={erro} onTentar={recarregar} />
      </>
    );
  }

  if (!turma) {
    return (
      <>
        <CabecalhoPagina sobretitulo="Consulta" titulo="Turma não encontrada" />
        <EstadoVazio
          titulo="Esta turma não está disponível"
          texto="O identificador informado não corresponde a uma turma cadastrada. Volte para a lista de turmas."
          acao={
            <a className="botao botao--pequeno" href="#/consulta">
              <Icone nome="seta-esquerda" tamanho={15} />
              Voltar para turmas
            </a>
          }
        />
      </>
    );
  }

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Consulta / Horário por turma"
        titulo={turma.nome}
        descricao={`${turma.serie} · ${ROTULOS_MODALIDADE[turma.modalidade]} · período da manhã`}
        acoes={
          <>
            <a className="botao botao--fantasma" href="#/consulta">
              <Icone nome="seta-esquerda" tamanho={15} />
              Turmas
            </a>
            {turma.status === 'ativo' ? (
              <button
                type="button"
                className={favorita ? 'botao botao--secundario' : 'botao'}
                aria-pressed={favorita}
                disabled={carregandoFavoritos}
                onClick={() => void alternar(turma.id)}
              >
                <Icone nome="estrela" tamanho={16} preenchido={favorita} />
                {favorita ? 'Remover favorito' : 'Favoritar turma'}
              </button>
            ) : (
              <SeloStatus status={turma.status} />
            )}
            {usuario && podeAdministrar(usuario.papel) ? (
              <a className="botao" href={`#/painel/horarios/${turma.id}`}>
                <Icone nome="editar" tamanho={15} />
                Editar grade
              </a>
            ) : null}
          </>
        }
      />

      <div className="cartao" style={{ marginBottom: '16px' }}>
        <div className="cartao__corpo">
          <dl className="rotulo-valor" style={{ borderBottom: 0, padding: 0 }}>
            <dt>Turma</dt>
            <dd>
              {turma.nome} — {turma.serie}
            </dd>
            <dt>Modalidade</dt>
            <dd>{ROTULOS_MODALIDADE[turma.modalidade]}</dd>
            <dt>Dias letivos</dt>
            <dd>Segunda-feira a sexta-feira</dd>
            <dt>Total de aulas</dt>
            <dd>{aulas.length} aulas na semana</dd>
          </dl>
        </div>
      </div>

      {aulas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma aula cadastrada"
          texto="Esta turma ainda não possui aulas na grade semanal. A administração deve definir as aulas."
        />
      ) : (
        <GradeSemanal
          configuracao={dados?.catalogo.configuracao ?? { abertura: '', fechamento: '', periodos: [], intervalo: null, atualizadoEm: '' }}
          aulas={aulas}
          rotuloTabela={`Grade semanal da turma ${turma.nome}`}
        />
      )}
    </>
  );
}
