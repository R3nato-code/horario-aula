import { Fragment, useRef, useState, type DragEvent, type ReactNode } from 'react';
import type { AulaDetalhada, ConfiguracaoHorarios, DiaSemana, PeriodoAula } from '@/types/dominio';
import { DIAS_SEMANA, NUMEROS_PERIODOS } from '@/lib/constantes';
import { Icone } from '@/components/Icone';

/** Coordenada de uma célula da grade semanal. */
export interface ReferenciaCelula {
  dia: DiaSemana;
  periodo: PeriodoAula;
}

interface Props {
  configuracao: ConfiguracaoHorarios;
  aulas: AulaDetalhada[];
  contexto?: 'turma' | 'professor';
  editavel?: boolean;
  onEditar?: (dia: DiaSemana, periodo: PeriodoAula) => void;
  /**
   * Habilita o arrastar-e-soltar entre células. Quando o destino possui aula,
   * o serviço troca disciplina e professor; quando está vazio, move a aula.
   */
  onTrocar?: (origem: ReferenciaCelula, destino: ReferenciaCelula) => void;
  /** Bloqueia novas interações enquanto a troca é gravada. */
  trocando?: boolean;
  rotuloTabela: string;
}

export function GradeSemanal({
  configuracao,
  aulas,
  contexto = 'turma',
  editavel = false,
  onEditar,
  onTrocar,
  trocando = false,
  rotuloTabela,
}: Props) {
  const [origemArrasto, setOrigemArrasto] = useState<ReferenciaCelula | null>(null);
  const [alvoArrasto, setAlvoArrasto] = useState<ReferenciaCelula | null>(null);
  const origemArrastoRef = useRef<ReferenciaCelula | null>(null);
  const bloquearCliqueRef = useRef(false);

  const mapa = new Map<string, AulaDetalhada>();
  aulas.forEach((aula) => mapa.set(`${aula.diaSemana}_${aula.periodo}`, aula));

  const horarioDoPeriodo = (periodo: PeriodoAula) => {
    const encontrado = configuracao.periodos.find((item) => item.numero === periodo);
    return encontrado ? `${encontrado.inicio}–${encontrado.fim}` : '--:--';
  };

  const mesmaCelula = (
    referencia: ReferenciaCelula | null,
    dia: DiaSemana,
    periodo: PeriodoAula,
  ) => referencia?.dia === dia && referencia?.periodo === periodo;

  const podeArrastar = editavel && Boolean(onTrocar) && !trocando;

  const limparArrasto = () => {
    origemArrastoRef.current = null;
    setOrigemArrasto(null);
    setAlvoArrasto(null);
    // O clique disparado ao final de um arrasto não deve abrir o editor.
    window.setTimeout(() => {
      bloquearCliqueRef.current = false;
    }, 150);
  };

  const propsArrasto = (dia: DiaSemana, periodo: PeriodoAula, temAula: boolean) => {
    if (!podeArrastar) return {};

    return {
      draggable: temAula,
      onDragStart: (evento: DragEvent<HTMLElement>) => {
        if (!temAula) {
          evento.preventDefault();
          return;
        }
        origemArrastoRef.current = { dia, periodo };
        setOrigemArrasto({ dia, periodo });
        setAlvoArrasto(null);
        bloquearCliqueRef.current = true;
        evento.dataTransfer.effectAllowed = 'move';
        evento.dataTransfer.setData('text/plain', `${dia}_${periodo}`);
      },
      onDragEnd: limparArrasto,
      onDragOver: (evento: DragEvent<HTMLElement>) => {
        if (!origemArrastoRef.current) return;
        evento.preventDefault();
        evento.dataTransfer.dropEffect = 'move';
        if (mesmaCelula(origemArrastoRef.current, dia, periodo)) {
          setAlvoArrasto(null);
          return;
        }
        if (!mesmaCelula(alvoArrasto, dia, periodo)) {
          setAlvoArrasto({ dia, periodo });
        }
      },
      onDrop: (evento: DragEvent<HTMLElement>) => {
        evento.preventDefault();
        const origem = origemArrastoRef.current;
        origemArrastoRef.current = null;
        setOrigemArrasto(null);
        setAlvoArrasto(null);
        bloquearCliqueRef.current = false;
        if (!origem || !onTrocar) return;
        if (mesmaCelula(origem, dia, periodo)) return;
        onTrocar(origem, { dia, periodo });
      },
    };
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
      const ehOrigem = mesmaCelula(origemArrasto, dia, periodo);
      const ehAlvo = mesmaCelula(alvoArrasto, dia, periodo);
      const classes = [
        'celula-arrastavel',
        ehOrigem ? 'celula-arrastavel--arrastando' : '',
        ehAlvo ? 'celula-arrastavel--alvo' : '',
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <div
          className={classes}
          {...propsArrasto(dia, periodo, Boolean(aula))}
          title={
            podeArrastar && aula
              ? 'Arraste para outra célula para trocar de posição'
              : undefined
          }
        >
          <button
            type="button"
            className={`celula-editavel${aula ? '' : ' celula-editavel--vazia'}`}
            draggable={podeArrastar && Boolean(aula)}
            onClick={() => {
              if (bloquearCliqueRef.current || trocando) return;
              onEditar(dia, periodo);
            }}
            aria-label={`Editar ${descricao}`}
            aria-describedby={podeArrastar ? 'instrucao-arrasto-grade' : undefined}
          >
            {conteudoCelula(aula)}
          </button>
        </div>
      );
    }
    return conteudoCelula(aula);
  };

  const intervalo = configuracao.intervalo;

  return (
    <>
      {podeArrastar ? (
        <>
          <p id="instrucao-arrasto-grade" className="somente-leitor">
            Arraste uma aula para outra célula para trocar as posições. Pressione Enter para
            editar a aula.
          </p>
          <div className="somente-leitor" aria-live="polite">
            {origemArrasto
              ? 'Aula selecionada. Solte sobre outra célula para trocar as posições.'
              : ''}
          </div>
        </>
      ) : null}

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
            {podeArrastar ? (
              <span>
                Arraste uma aula para outra célula para trocar as posições. Soltar em uma célula
                vazia apenas move a aula.
              </span>
            ) : null}
            <span>Selecione uma célula para alterar disciplina e professor.</span>
            <span>Os horários exibidos são os da configuração vigente.</span>
          </div>
        ) : null}
      </div>

      <div className="agenda-movel">
        {DIAS_SEMANA.map((dia) => {
          const totalAulasDia = NUMEROS_PERIODOS.filter((periodo) =>
            mapa.has(`${dia.valor}_${periodo}`),
          ).length;

          return (
            <section className="dia-movel" key={dia.valor} aria-labelledby={`dia-${dia.valor}`}>
              <h3 className="dia-movel__titulo" id={`dia-${dia.valor}`}>
                <span>{dia.nome}</span>
                <span className="dia-movel__contagem">
                  {totalAulasDia} {totalAulasDia === 1 ? 'aula' : 'aulas'}
                </span>
              </h3>
              <div className="dia-movel__aulas">
                {NUMEROS_PERIODOS.map((periodo) => {
                  const aula = mapa.get(`${dia.valor}_${periodo}`);

                  const conteudo = (
                    <>
                      <span className="aula-movel__horario">
                        <span className="aula-movel__periodo">{periodo}ª aula</span>
                        <span className="aula-movel__faixa">{horarioDoPeriodo(periodo)}</span>
                      </span>
                      <span className="aula-movel__conteudo">
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

                  let elementoAula: ReactNode;
                  if (editavel && onEditar) {
                    const ehOrigem = mesmaCelula(origemArrasto, dia.valor, periodo);
                    const ehAlvo = mesmaCelula(alvoArrasto, dia.valor, periodo);
                    const classes = [
                      'aula-movel',
                      'aula-movel--editavel',
                      aula ? '' : 'aula-movel--vazia',
                      ehOrigem ? 'aula-movel--arrastando' : '',
                      ehAlvo ? 'aula-movel--alvo' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    elementoAula = (
                      <button
                        type="button"
                        className={classes}
                        key={periodo}
                        {...propsArrasto(dia.valor, periodo, Boolean(aula))}
                        onClick={() => {
                          if (bloquearCliqueRef.current || trocando) return;
                          onEditar(dia.valor, periodo);
                        }}
                        aria-label={`Editar ${dia.nome}, ${periodo}ª aula, ${
                          aula?.disciplinaNome ?? 'sem aula definida'
                        }`}
                        aria-describedby={podeArrastar ? 'instrucao-arrasto-grade' : undefined}
                      >
                        {conteudo}
                        <span className="aula-movel__acao" aria-hidden="true">
                          <Icone nome="editar" tamanho={15} />
                        </span>
                      </button>
                    );
                  } else {
                    elementoAula = (
                      <div
                        className={`aula-movel${aula ? '' : ' aula-movel--vazia'}`}
                        key={periodo}
                      >
                        {conteudo}
                      </div>
                    );
                  }

                  if (periodo === 4 && intervalo) {
                    return (
                      <Fragment key={periodo}>
                        <div className="aula-movel aula-movel--intervalo">
                          <span className="aula-movel__horario">
                            <span className="aula-movel__periodo">Intervalo</span>
                            <span className="aula-movel__faixa">
                              {intervalo.inicio}–{intervalo.fim}
                            </span>
                          </span>
                          <span className="aula-movel__conteudo">
                            <span className="aula-movel__disciplina">Pausa entre as aulas</span>
                          </span>
                        </div>
                        {elementoAula}
                      </Fragment>
                    );
                  }

                  return elementoAula;
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
