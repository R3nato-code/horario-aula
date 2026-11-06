import { useMemo, useState } from 'react';
import type { DiaSemana, PeriodoAula, Turma } from '@/types/dominio';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { Alerta } from '@/components/ui/Alerta';
import { Campo } from '@/components/ui/Campo';
import { Modal } from '@/components/ui/Modal';
import { SeloStatus } from '@/components/ui/Selos';
import { Icone } from '@/components/Icone';
import { GradeSemanal } from '@/features/horarios/GradeSemanal';
import { useConsulta } from '@/app/useConsulta';
import { useServicos } from '@/app/ContextoServicos';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { useToast } from '@/app/ContextoToast';
import { useTituloPagina } from '@/lib/useTituloPagina';
import { mensagemDoErro, ehErroDeServico } from '@/services/erros';
import { DIAS_SEMANA, ROTULOS_MODALIDADE } from '@/lib/constantes';

interface Props {
  turmaIdInicial?: string;
}

interface CelulaSelecionada {
  dia: DiaSemana;
  periodo: PeriodoAula;
}

export function HorariosAdminPage({ turmaIdInicial }: Props) {
  useTituloPagina('Edição de horários');
  const { escola } = useServicos();
  const { usuario } = useAutenticacao();
  const { notificar } = useToast();
  const [turmaSelecionada, setTurmaSelecionada] = useState(turmaIdInicial ?? '');
  const [celula, setCelula] = useState<CelulaSelecionada | null>(null);
  const [disciplinaId, setDisciplinaId] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [detalheErro, setDetalheErro] = useState<string | null>(null);

  const { dados, carregando, erro, recarregar } = useConsulta(async () => {
    const catalogo = await escola.listarCatalogo();
    // Quando nenhuma turma foi escolhida, assume a primeira turma ativa como
    // padrão dentro da própria consulta (sem setState em efeito).
    const idPadrao =
      turmaSelecionada || catalogo.turmas.find((item) => item.status === 'ativo')?.id || '';
    const turma = catalogo.turmas.find((item) => item.id === idPadrao) ?? null;
    if (!turma) return { catalogo, turma: null, aulas: [], configuracao: catalogo.configuracao };
    const aulas = await escola.listarAulas({ turmaId: turma.id });
    return { catalogo, turma, aulas, configuracao: catalogo.configuracao };
  }, `horarios-admin-${turmaSelecionada}`);

  const turma = dados?.turma ?? null;
  const aulas = dados?.aulas ?? [];
  // Fallback do select: sem seleção explícita, reflete a turma padrão resolvida
  // pela consulta.
  const turmaExibidaId = turmaSelecionada || turma?.id || '';

  const opcoesTurmas = useMemo(() => {
    if (!dados) return [];
    const ativas = dados.catalogo.turmas.filter((item) => item.status === 'ativo');
    if (turma && turma.status === 'arquivado' && !ativas.some((item) => item.id === turma.id)) {
      return [...ativas, turma];
    }
    return ativas;
  }, [dados, turma]);

  const opcoesDisciplinas = useMemo(() => {
    if (!dados) return [];
    return dados.catalogo.disciplinas.filter(
      (item) => item.status === 'ativo' || item.id === disciplinaId,
    );
  }, [dados, disciplinaId]);

  const opcoesProfessores = useMemo(() => {
    if (!dados) return [];
    return dados.catalogo.professores.filter(
      (item) => item.status === 'ativo' || item.id === professorId,
    );
  }, [dados, professorId]);

  const abrirCelula = (dia: DiaSemana, periodo: PeriodoAula) => {
    const aula = aulas.find((item) => item.diaSemana === dia && item.periodo === periodo);
    setCelula({ dia, periodo });
    setDisciplinaId(aula?.disciplinaId ?? '');
    setProfessorId(aula?.professorId ?? '');
    setErroFormulario(null);
    setDetalheErro(null);
  };

  const salvar = async () => {
    if (!celula || !turma || !usuario) return;
    if (!disciplinaId || !professorId) {
      setErroFormulario('Selecione a disciplina e o professor da aula.');
      return;
    }
    setSalvando(true);
    setErroFormulario(null);
    setDetalheErro(null);
    try {
      await escola.salvarAula(
        {
          turmaId: turma.id,
          diaSemana: celula.dia,
          periodo: celula.periodo,
          disciplinaId,
          professorId,
        },
        usuario,
      );
      notificar('sucesso', 'Aula atualizada. A grade e o histórico foram atualizados.');
      setCelula(null);
      recarregar();
    } catch (falha) {
      setErroFormulario(mensagemDoErro(falha));
      setDetalheErro(ehErroDeServico(falha) ? falha.detalhes : null);
    } finally {
      setSalvando(false);
    }
  };

  const nomeDia = celula
    ? DIAS_SEMANA.find((dia) => dia.valor === celula.dia)?.nome ?? ''
    : '';

  const horarioCelula = celula
    ? dados?.configuracao.periodos.find((periodo) => periodo.numero === celula.periodo)
    : undefined;

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Administração"
        titulo="Edição de horários"
        descricao="Selecione uma turma e edite a célula correspondente à aula. As alterações são validadas antes da gravação."
        acoes={
          <a className="botao" href="#/painel/configuracao">
            <Icone nome="config" tamanho={16} />
            Configuração de aulas
          </a>
        }
      />

      {erro ? <EstadoErro texto={erro} onTentar={recarregar} /> : null}
      {carregando && !dados ? <EstadoCarregando texto="Carregando grade administrativa…" /> : null}

      {dados ? (
        <div className="pilha-secoes">
          <div className="barra-ferramentas" style={{ marginBottom: 0 }}>
            <div className="barra-ferramentas__grupo">
              <Campo id="turma-horario" rotulo="Turma" className="cresce">
                <select
                  id="turma-horario"
                  className="campo__controle"
                  value={turmaExibidaId}
                  onChange={(evento) => {
                    setTurmaSelecionada(evento.target.value);
                    setCelula(null);
                  }}
                  style={{ minWidth: '240px' }}
                >
                  <option value="">Selecione uma turma</option>
                  {opcoesTurmas.map((item: Turma) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                      {item.status === 'arquivado' ? ' — arquivada' : ''}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            {turma ? (
              <div className="linha-flex">
                <SeloStatus status={turma.status} />
                <span className="texto-pequeno texto-secundario">
                  {turma.serie} · {ROTULOS_MODALIDADE[turma.modalidade]}
                </span>
                <a className="texto-pequeno" href={`#/consulta/turma/${turma.id}`}>
                  Ver consulta
                </a>
              </div>
            ) : null}
          </div>

          <Alerta tipo="info" titulo="Validação de conflitos">
            A pré-validação exibida neste ambiente é local. A validação definitiva de professor,
            turma e sala deve ocorrer no servidor, conforme D-03 e RF29–RF35.
          </Alerta>

          {!turma ? (
            <EstadoVazio
              titulo="Selecione uma turma"
              texto="Escolha uma turma ativa para visualizar e editar a grade semanal."
            />
          ) : turma.status === 'arquivado' ? (
            <Alerta tipo="aviso" titulo="Turma arquivada">
              Turmas arquivadas não podem receber alterações de horário. Reative o cadastro na
              seção Arquivados antes de editar.
            </Alerta>
          ) : (
            <>
              {carregando ? (
                <span className="carregando">
                  <span className="carregando__marca" aria-hidden="true" />
                  Atualizando grade…
                </span>
              ) : null}
              <GradeSemanal
                configuracao={dados.configuracao}
                aulas={aulas}
                editavel
                onEditar={abrirCelula}
                rotuloTabela={`Grade editável da turma ${turma.nome}`}
              />
              <p className="texto-pequeno texto-secundario">
                A edição em massa (RF23–RF30) será habilitada após a definição dos limites e da
                estratégia de atomicidade (LAC-05). Nenhuma seleção múltipla é oferecida nesta
                versão.
              </p>
            </>
          )}
        </div>
      ) : null}

      <Modal
        aberto={celula !== null}
        titulo={celula ? `Editar ${nomeDia.toLowerCase()}, ${celula.periodo}ª aula` : 'Editar aula'}
        subtitulo={
          turma
            ? `${turma.nome}${horarioCelula ? ` · ${horarioCelula.inicio}–${horarioCelula.fim}` : ''}`
            : undefined
        }
        onFechar={() => {
          if (!salvando) setCelula(null);
        }}
        rodape={
          <>
            <button
              type="button"
              className="botao"
              onClick={() => setCelula(null)}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="botao botao--primario"
              onClick={() => void salvar()}
              disabled={salvando}
              aria-busy={salvando}
            >
              {salvando ? 'Salvando…' : 'Salvar alteração'}
            </button>
          </>
        }
      >
        <div className="empilhado">
          {erroFormulario ? (
            <Alerta tipo="erro" titulo="Alteração não aplicada">
              {erroFormulario}
              {detalheErro ? (
                <p className="texto-pequeno" style={{ marginTop: '6px' }}>
                  {detalheErro}
                </p>
              ) : null}
            </Alerta>
          ) : null}

          <Campo id="aula-disciplina" rotulo="Disciplina" obrigatorio>
            <select
              id="aula-disciplina"
              className="campo__controle"
              value={disciplinaId}
              onChange={(evento) => setDisciplinaId(evento.target.value)}
            >
              <option value="">Selecione a disciplina</option>
              {opcoesDisciplinas.map((disciplina) => (
                <option key={disciplina.id} value={disciplina.id}>
                  {disciplina.nome}
                  {disciplina.status === 'arquivado' ? ' — arquivada' : ''}
                </option>
              ))}
            </select>
          </Campo>

          <Campo id="aula-professor" rotulo="Professor" obrigatorio>
            <select
              id="aula-professor"
              className="campo__controle"
              value={professorId}
              onChange={(evento) => setProfessorId(evento.target.value)}
            >
              <option value="">Selecione o professor</option>
              {opcoesProfessores.map((professor) => (
                <option key={professor.id} value={professor.id}>
                  {professor.nome}
                  {professor.status === 'arquivado' ? ' — arquivado' : ''}
                </option>
              ))}
            </select>
          </Campo>

          <Alerta tipo="aviso" titulo="Impacto da alteração">
            A mudança substitui a associação atual da aula, gera registro de histórico e
            notificação para usuários que favoritaram a turma. Conflitos de professor impedem a
            gravação.
          </Alerta>
        </div>
      </Modal>
    </>
  );
}
