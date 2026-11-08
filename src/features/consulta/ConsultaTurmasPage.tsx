import { useMemo, useState } from 'react';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { Icone } from '@/components/Icone';
import { Alerta } from '@/components/ui/Alerta';
import { useConsulta } from '@/app/useConsulta';
import { useServicos } from '@/app/ContextoServicos';
import { useFavoritos } from '@/app/ContextoFavoritos';
import { useTituloPagina } from '@/lib/useTituloPagina';
import type { Modalidade, Turma } from '@/types/dominio';
import { ROTULOS_MODALIDADE } from '@/lib/constantes';

const ORDEM_MODALIDADES: readonly Modalidade[] = ['ensino-medio', 'tecnico'];

function CartaoTurma({ turma }: { turma: Turma }) {
  const { ehFavorita, alternar, carregando } = useFavoritos();
  const favorita = ehFavorita(turma.id);

  return (
    <article className={`turma-cartao${turma.modalidade === 'tecnico' ? ' turma-cartao--tecnico' : ''}`}>
      <div className="turma-cartao__topo">
        <div>
          <a
            className="turma-cartao__nome turma-cartao__link"
            href={`#/consulta/turma/${turma.id}`}
            aria-label={`Ver horário da turma ${turma.nome}`}
          >
            {turma.nome}
          </a>
          <p className="turma-cartao__meta">
            {turma.serie} · {ROTULOS_MODALIDADE[turma.modalidade]}
          </p>
        </div>
        <button
          type="button"
          className="favorito-botao"
          aria-pressed={favorita}
          aria-label={favorita ? `Remover ${turma.nome} dos favoritos` : `Favoritar ${turma.nome}`}
          title={favorita ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          disabled={carregando}
          onClick={() => void alternar(turma.id)}
        >
          <Icone nome="estrela" tamanho={18} preenchido={favorita} />
        </button>
      </div>
      <p className="turma-cartao__meta">Período da manhã · seis aulas por dia</p>
      <div className="turma-cartao__rodape">
        <span
          className="botao botao--fantasma botao--pequeno turma-cartao__atalho"
          aria-hidden="true"
        >
          Ver horário
          <Icone nome="seta-direita" tamanho={14} />
        </span>
        {favorita ? <span className="selo selo--ativo">Favorita</span> : null}
      </div>
    </article>
  );
}

export function ConsultaTurmasPage() {
  useTituloPagina('Horários por turma');
  const { escola } = useServicos();
  const { dados, carregando, erro, recarregar } = useConsulta(
    () => escola.listarCatalogo(),
    'catalogo-turmas',
  );
  const { favoritos } = useFavoritos();
  const [busca, setBusca] = useState('');

  const turmasAtivas = useMemo(
    () => (dados?.turmas ?? []).filter((turma) => turma.status === 'ativo'),
    [dados],
  );

  const turmasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return turmasAtivas;
    return turmasAtivas.filter((turma) =>
      `${turma.nome} ${turma.serie} ${ROTULOS_MODALIDADE[turma.modalidade]}`
        .toLocaleLowerCase('pt-BR')
        .includes(termo),
    );
  }, [busca, turmasAtivas]);

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Consulta"
        titulo="Horários por turma"
        descricao="Selecione uma turma para consultar a grade semanal com disciplina, professor e horários reais de início e término."
        acoes={
          <>
            <a className="botao" href="#/favoritos">
              <Icone nome="estrela" tamanho={16} />
              Favoritos ({favoritos.length})
            </a>
            <a className="botao botao--secundario" href="#/consulta/professor">
              <Icone nome="usuarios" tamanho={16} />
              Aulas por professor
            </a>
          </>
        }
      />

      {erro ? <EstadoErro texto={erro} onTentar={recarregar} /> : null}
      {carregando && !dados ? <EstadoCarregando texto="Carregando turmas…" /> : null}

      {dados && !erro ? (
        <>
          <div className="barra-ferramentas" style={{ marginTop: '8px' }}>
            <div className="busca">
              <Icone nome="busca" tamanho={16} />
              <label className="somente-leitor" htmlFor="busca-turma">
                Buscar turma
              </label>
              <input
                id="busca-turma"
                className="campo__controle"
                type="search"
                placeholder="Buscar turma, série ou modalidade"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
              />
            </div>
            <p className="texto-pequeno texto-secundario">
              {turmasFiltradas.length} de {turmasAtivas.length} turmas ativas
            </p>
          </div>

          {favoritos.length > 0 ? (
            <div className="secao-catalogo">
              <Alerta tipo="info" titulo="Suas turmas favoritas">
                Você recebe notificações internas quando uma aula dessas turmas é alterada.
                <span className="texto-pequeno">
                  {' '}
                  {favoritos.length} turma(s) favorita(s).
                </span>
              </Alerta>
            </div>
          ) : null}

          {turmasFiltradas.length === 0 ? (
            <EstadoVazio
              titulo="Nenhuma turma encontrada"
              texto="Ajuste a busca ou consulte a lista completa de turmas ativas."
              acao={
                <button type="button" className="botao botao--pequeno" onClick={() => setBusca('')}>
                  Limpar busca
                </button>
              }
            />
          ) : (
            ORDEM_MODALIDADES.map((modalidade) => {
              const turmas = turmasFiltradas.filter((turma) => turma.modalidade === modalidade);
              if (turmas.length === 0) return null;
              return (
                <section className="secao-catalogo" key={modalidade} aria-labelledby={`modalidade-${modalidade}`}>
                  <div className="secao-catalogo__cabecalho">
                    <h2 className="secao-catalogo__titulo" id={`modalidade-${modalidade}`}>
                      {ROTULOS_MODALIDADE[modalidade]}
                    </h2>
                    <span className="texto-pequeno texto-secundario">
                      {turmas.length} turma(s)
                    </span>
                  </div>
                  <div className="grade-turmas">
                    {turmas.map((turma) => (
                      <CartaoTurma key={turma.id} turma={turma} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </>
      ) : null}
    </>
  );
}
