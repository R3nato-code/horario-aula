import type { AulaDetalhada, ConfiguracaoHorarios, DiaSemana, PeriodoAula } from '@/types/dominio';
import { DIAS_SEMANA, NUMEROS_PERIODOS } from '@/lib/constantes';
import { Icone } from '@/components/Icone';

interface Props {
  configuracao: ConfiguracaoHorarios;
  aulas: AulaDetalhada[];
  contexto?: 'turma' | 'professor';
  editavel?: boolean;
  onEditar?: (dia: DiaSemana, periodo: PeriodoAula) => void;
  rotuloTabela: string;
}

export function GradeSemanal({
  configuracao,
  aulas,
  contexto = 'turma',
  editavel = false,
  onEditar,
  rotuloTabela,
}: Props) {
  const mapa = new Map<string, AulaDetalhada>();
  aulas.forEach((aula) => mapa.set(`${aula.diaSemana}_${aula.periodo}`, aula));

  const horarioDoPeriodo = (periodo: PeriodoAula) => {
    const encontrado = configuracao.periodos.find((item) => item.numero === periodo);
    return encontrado ? `${encontrado.inicio}–${encontrado.fim}` : '--:--';
  };

  const conteudoCelula = (aula: AulaDetalhada | undefined) => {
    if (!aula) {
      return <div className="celula-aula celula-aula--vazia">Sem aula definida</div>;
    }
    return (
      <div className="celula-aula">
        <span className="celula-aula__disciplina">{aula.disciplinaNome}</span>
        <span className="celula-aula__professor">
          {contexto === 'turma' ? aula.professorNome : aula.turmaNome}
        </span>
      </div>
    );
  };

  const celula = (dia: DiaSemana, periodo: PeriodoAula) => {
    const aula = mapa.get(`${dia}_${periodo}`);
    const diaNome = DIAS_SEMANA.find((item) => item.valor === dia)?.nome ?? `Dia ${dia}`;
    const descricao = aula
      ? `${diaNome}, ${periodo}ª aula, ${aula.disciplinaNome}, ${
          contexto === 'turma' ? aula.professorNome : aula.turmaNome
        }`
      : `${diaNome}, ${periodo}ª aula, sem aula definida`;

    if (editavel && onEditar) {
      return (
        <button
          type="button"
          className={`celula-editavel${aula ? '' : ' celula-editavel--vazia'}`}
          onClick={() => onEditar(dia, periodo)}
          aria-label={`Editar ${descricao}`}
        >
          {conteudoCelula(aula)}
        </button>
      );
    }
    return conteudoCelula(aula);
  };

  const intervalo = configuracao.intervalo;

  return (
    <>
      <div className="grade-horaria-envoltorio">
        <table className="grade-horaria">
          <caption className="somente-leitor">{rotuloTabela}</caption>
          <thead>
            <tr>
              <th scope="col" className="grade-horaria__horario">
                Aula
              </th>
              {DIAS_SEMANA.map((dia) => (
                <th scope="col" key={dia.valor}>
                  {dia.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NUMEROS_PERIODOS.slice(0, 3).map((periodo) => (
              <tr key={periodo}>
                <th scope="row" className="grade-horaria__horario">
                  <span className="grade-horaria__periodo">{periodo}ª aula</span>
                  <span className="grade-horaria__faixa">{horarioDoPeriodo(periodo)}</span>
                </th>
                {DIAS_SEMANA.map((dia) => (
                  <td key={dia.valor}>{celula(dia.valor, periodo)}</td>
                ))}
              </tr>
            ))}

            {intervalo ? (
              <tr className="linha-intervalo">
                <td colSpan={6}>
                  Intervalo
                  <span className="linha-intervalo__horario">
                    {intervalo.inicio}–{intervalo.fim}
                  </span>
                </td>
              </tr>
            ) : null}

            {NUMEROS_PERIODOS.slice(3).map((periodo) => (
              <tr key={periodo}>
                <th scope="row" className="grade-horaria__horario">
                  <span className="grade-horaria__periodo">{periodo}ª aula</span>
                  <span className="grade-horaria__faixa">{horarioDoPeriodo(periodo)}</span>
                </th>
                {DIAS_SEMANA.map((dia) => (
                  <td key={dia.valor}>{celula(dia.valor, periodo)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {editavel ? (
          <div className="legenda-grade">
            <span>Selecione uma célula para alterar disciplina e professor.</span>
            <span>Os horários exibidos são os da configuração vigente.</span>
          </div>
        ) : null}
      </div>

      <div className="agenda-movel">
        {DIAS_SEMANA.map((dia) => (
          <section className="dia-movel" key={dia.valor} aria-labelledby={`dia-${dia.valor}`}>
            <h3 className="dia-movel__titulo" id={`dia-${dia.valor}`}>
              {dia.nome}
            </h3>
            <div>
              {NUMEROS_PERIODOS.map((periodo) => {
                const aula = mapa.get(`${dia.valor}_${periodo}`);
                if (periodo === 4 && intervalo) {
                  return (
                    <div className="aula-movel aula-movel--intervalo" key="intervalo">
                      <span>{intervalo.inicio}</span>
                      <span>
                        Intervalo até {intervalo.fim}
                      </span>
                    </div>
                  );
                }
                const conteudo = (
                  <>
                    <span className="aula-movel__horario">
                      {horarioDoPeriodo(periodo)}
                      <br />
                      {periodo}ª aula
                    </span>
                    <span>
                      <span className="aula-movel__disciplina">
                        {aula?.disciplinaNome ?? 'Sem aula definida'}
                      </span>
                      {aula ? (
                        <span className="aula-movel__professor">
                          {contexto === 'turma' ? aula.professorNome : aula.turmaNome}
                        </span>
                      ) : null}
                    </span>
                  </>
                );
                return editavel && onEditar ? (
                  <button
                    type="button"
                    className="aula-movel"
                    key={periodo}
                    style={{ width: '100%', border: 0, background: 'none', textAlign: 'left' }}
                    onClick={() => onEditar(dia.valor, periodo)}
                    aria-label={`Editar ${dia.nome}, ${periodo}ª aula, ${
                      aula?.disciplinaNome ?? 'sem aula definida'
                    }`}
                  >
                    {conteudo}
                    <Icone nome="editar" tamanho={15} />
                  </button>
                ) : (
                  <div className="aula-movel" key={periodo}>
                    {conteudo}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
