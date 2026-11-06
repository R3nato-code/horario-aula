import { useMemo } from 'react';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { SeloStatus } from '@/components/ui/Selos';
import { Icone } from '@/components/Icone';
import { useConsulta } from '@/app/useConsulta';
import { useServicos } from '@/app/ContextoServicos';
import { useTituloPagina } from '@/lib/useTituloPagina';
import { DIAS_SEMANA } from '@/lib/constantes';

interface Props {
  professorId: string;
}

export function ProfessorHorarioPage({ professorId }: Props) {
  const { escola } = useServicos();
  const { dados, carregando, erro, recarregar } = useConsulta(async () => {
    const [catalogo, aulas] = await Promise.all([
      escola.listarCatalogo(),
      escola.listarAulas({ professorId }),
    ]);
    return { catalogo, aulas };
  }, `professor-${professorId}`);

  const professor = dados?.catalogo.professores.find((item) => item.id === professorId) ?? null;
  useTituloPagina(professor ? `Aulas do professor ${professor.nome}` : 'Aulas por professor');

  const aulasPorDia = useMemo(
    () =>
      DIAS_SEMANA.map((dia) => ({
        dia,
        aulas: (dados?.aulas ?? []).filter((aula) => aula.diaSemana === dia.valor),
      })).filter((grupo) => grupo.aulas.length > 0),
    [dados],
  );

  if (carregando && !dados) {
    return (
      <>
        <CabecalhoPagina sobretitulo="Consulta" titulo="Aulas por professor" />
        <EstadoCarregando texto="Carregando aulas do professor…" />
      </>
    );
  }

  if (erro) {
    return (
      <>
        <CabecalhoPagina sobretitulo="Consulta" titulo="Aulas por professor" />
        <EstadoErro texto={erro} onTentar={recarregar} />
      </>
    );
  }

  if (!professor) {
    return (
      <>
        <CabecalhoPagina sobretitulo="Consulta" titulo="Professor não encontrado" />
        <EstadoVazio
          titulo="Este professor não está disponível"
          texto="O identificador informado não corresponde a um professor cadastrado."
          acao={
            <a className="botao botao--pequeno" href="#/consulta/professor">
              <Icone nome="seta-esquerda" tamanho={15} />
              Voltar para professores
            </a>
          }
        />
      </>
    );
  }

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Consulta / Aulas por professor"
        titulo={professor.nome}
        descricao={`${dados?.aulas.length ?? 0} aula(s) distribuídas de segunda a sexta-feira.`}
        acoes={
          <>
            <a className="botao botao--fantasma" href="#/consulta/professor">
              <Icone nome="seta-esquerda" tamanho={15} />
              Professores
            </a>
            {professor.status === 'arquivado' ? <SeloStatus status="arquivado" /> : null}
          </>
        }
      />

      {dados?.aulas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma aula atribuída"
          texto="Este professor não possui aulas na grade semanal atual."
        />
      ) : (
        <div className="pilha-secoes">
          {aulasPorDia.map(({ dia, aulas }) => (
            <section key={dia.valor} aria-labelledby={`professor-dia-${dia.valor}`}>
              <div className="secao-catalogo__cabecalho">
                <h2 className="secao-catalogo__titulo" id={`professor-dia-${dia.valor}`}>
                  {dia.nome}
                </h2>
                <span className="texto-pequeno texto-secundario">{aulas.length} aula(s)</span>
              </div>
              <div className="aulas-professor">
                {aulas.map((aula) => (
                  <article className="aula-cartao" key={aula.id}>
                    <span className="aula-cartao__horario">
                      {aula.periodo}ª aula · {aula.inicio}–{aula.fim}
                    </span>
                    <span className="aula-cartao__disciplina">{aula.disciplinaNome}</span>
                    <a className="aula-cartao__turma" href={`#/consulta/turma/${aula.turmaId}`}>
                      Turma {aula.turmaNome}
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
