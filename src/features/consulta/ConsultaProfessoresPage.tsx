import { useMemo, useState } from 'react';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { Icone } from '@/components/Icone';
import { useConsulta } from '@/app/useConsulta';
import { useServicos } from '@/app/ContextoServicos';
import { useTituloPagina } from '@/lib/useTituloPagina';
import { normalizarTexto } from '@/lib/utilidades';

export function ConsultaProfessoresPage() {
  useTituloPagina('Aulas por professor');
  const { escola } = useServicos();
  const { dados, carregando, erro, recarregar } = useConsulta(async () => {
    const [catalogo, aulas] = await Promise.all([
      escola.listarCatalogo(),
      escola.listarAulas(),
    ]);
    return { catalogo, aulas };
  }, 'consulta-professores');
  const [busca, setBusca] = useState('');

  const professores = useMemo(() => {
    const ativos = (dados?.catalogo.professores ?? []).filter(
      (professor) => professor.status === 'ativo',
    );
    const termo = normalizarTexto(busca);
    return ativos
      .filter((professor) => !termo || normalizarTexto(professor.nome).includes(termo))
      .map((professor) => ({
        ...professor,
        totalAulas: (dados?.aulas ?? []).filter((aula) => aula.professorId === professor.id).length,
      }));
  }, [busca, dados]);

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Consulta"
        titulo="Aulas por professor"
        descricao="Consulte a distribuição semanal de aulas de cada professor ativo, com turma, disciplina e horário."
        acoes={
          <a className="botao botao--fantasma" href="#/consulta">
            <Icone nome="seta-esquerda" tamanho={15} />
            Horários por turma
          </a>
        }
      />

      {erro ? <EstadoErro texto={erro} onTentar={recarregar} /> : null}
      {carregando && !dados ? <EstadoCarregando texto="Carregando professores…" /> : null}

      {dados && !erro ? (
        <>
          <div className="barra-ferramentas">
            <div className="busca">
              <Icone nome="busca" tamanho={16} />
              <label className="somente-leitor" htmlFor="busca-professor">
                Buscar professor
              </label>
              <input
                id="busca-professor"
                className="campo__controle"
                type="search"
                placeholder="Buscar professor pelo nome"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
              />
            </div>
            <p className="texto-pequeno texto-secundario">
              {professores.length} professor(es) ativo(s)
            </p>
          </div>

          {professores.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum professor encontrado"
              texto="A busca não retornou professores ativos. Ajuste o termo pesquisado."
              acao={
                <button type="button" className="botao botao--pequeno" onClick={() => setBusca('')}>
                  Limpar busca
                </button>
              }
            />
          ) : (
            <div className="envoltorio-tabela">
              <table className="tabela">
                <caption>Professores ativos e quantidade de aulas na semana</caption>
                <thead>
                  <tr>
                    <th scope="col">Professor</th>
                    <th scope="col">Aulas na semana</th>
                    <th scope="col">
                      <span className="somente-leitor">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {professores.map((professor) => (
                    <tr key={professor.id}>
                      <th scope="row" style={{ fontWeight: 600 }}>
                        {professor.nome}
                      </th>
                      <td className="tabela__numero">{professor.totalAulas}</td>
                      <td>
                        <div className="tabela__acoes">
                          <a
                            className="botao botao--fantasma botao--pequeno"
                            href={`#/consulta/professor/${professor.id}`}
                          >
                            Ver aulas
                            <Icone nome="seta-direita" tamanho={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </>
  );
}
