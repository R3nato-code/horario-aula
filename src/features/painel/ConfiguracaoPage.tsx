import { useState } from 'react';
import type { ConfiguracaoHorarios, PeriodoHorario } from '@/types/dominio';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoCarregando, EstadoErro } from '@/components/ui/Estados';
import { Alerta } from '@/components/ui/Alerta';
import { Campo } from '@/components/ui/Campo';
import { Icone } from '@/components/Icone';
import { AcessoNegadoPage } from '@/features/sistema/PaginasSistema';
import { useConsulta } from '@/app/useConsulta';
import { useServicos } from '@/app/ContextoServicos';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { useToast } from '@/app/ContextoToast';
import { podeEditarDuracaoAulas } from '@/lib/constantes';
import { useTituloPagina } from '@/lib/useTituloPagina';
import { mensagemDoErro } from '@/services/erros';
import { validarConfiguracao } from '@/lib/validacaoHorarios';

function FormularioConfiguracao({
  configuracao,
  onSalvo,
}: {
  configuracao: ConfiguracaoHorarios;
  onSalvo: () => void;
}) {
  const { escola } = useServicos();
  const { usuario } = useAutenticacao();
  const { notificar } = useToast();
  const [abertura, setAbertura] = useState(configuracao.abertura);
  const [fechamento, setFechamento] = useState(configuracao.fechamento);
  const [periodos, setPeriodos] = useState<PeriodoHorario[]>(
    configuracao.periodos.map((periodo) => ({ ...periodo })),
  );
  const [possuiIntervalo, setPossuiIntervalo] = useState(configuracao.intervalo !== null);
  const [intervalo, setIntervalo] = useState(
    configuracao.intervalo ?? { inicio: '09:45', fim: '10:10' },
  );
  const [erros, setErros] = useState<string[]>([]);
  const [erroServico, setErroServico] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const atualizarPeriodo = (numero: number, campo: 'inicio' | 'fim', valor: string) => {
    setPeriodos((atuais) =>
      atuais.map((periodo) => (periodo.numero === numero ? { ...periodo, [campo]: valor } : periodo)),
    );
  };

  const salvar = async () => {
    if (!usuario) return;
    const proposta: ConfiguracaoHorarios = {
      abertura,
      fechamento,
      periodos: [...periodos].sort((a, b) => a.numero - b.numero),
      intervalo: possuiIntervalo ? intervalo : null,
      atualizadoEm: configuracao.atualizadoEm,
    };
    const errosLocais = validarConfiguracao(proposta);
    setErros(errosLocais);
    setErroServico(null);
    if (errosLocais.length > 0) return;

    setSalvando(true);
    try {
      await escola.salvarConfiguracao(proposta, usuario);
      notificar('sucesso', 'Configuração de horários atualizada e registrada no histórico.');
      onSalvo();
    } catch (falha) {
      const mensagem = mensagemDoErro(falha);
      setErroServico(mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="pilha-secoes">
      {erros.length > 0 || erroServico ? (
        <Alerta tipo="erro" titulo="A configuração não pode ser salva">
          {erroServico ? <p>{erroServico}</p> : null}
          {erros.length > 0 ? (
            <ul style={{ marginTop: erroServico ? '8px' : 0 }}>
              {erros.map((erro) => (
                <li key={erro} style={{ paddingLeft: '16px', listStyle: 'disc' }}>
                  {erro}
                </li>
              ))}
            </ul>
          ) : null}
        </Alerta>
      ) : null}

      <section className="cartao" aria-labelledby="funcionamento-titulo">
        <div className="cartao__cabecalho">
          <h2 className="cartao__titulo" id="funcionamento-titulo">
            Funcionamento da escola
          </h2>
        </div>
        <div className="cartao__corpo">
          <div className="grade-campos">
            <Campo id="config-abertura" rotulo="Abertura" obrigatorio>
              <input
                id="config-abertura"
                type="time"
                className="campo__controle"
                value={abertura}
                onChange={(evento) => setAbertura(evento.target.value)}
              />
            </Campo>
            <Campo id="config-fechamento" rotulo="Fechamento" obrigatorio>
              <input
                id="config-fechamento"
                type="time"
                className="campo__controle"
                value={fechamento}
                onChange={(evento) => setFechamento(evento.target.value)}
              />
            </Campo>
          </div>
        </div>
      </section>

      <section className="cartao" aria-labelledby="aulas-titulo">
        <div className="cartao__cabecalho">
          <h2 className="cartao__titulo" id="aulas-titulo">
            Aulas e intervalo
          </h2>
          <span className="texto-pequeno texto-secundario">Horários reais de início e término</span>
        </div>
        <div className="cartao__corpo" style={{ padding: 0 }}>
          <div className="config-periodos">
            {periodos.map((periodo, indice) => (
              <div key={periodo.numero}>
                <div className="config-periodo">
                  <span className="config-periodo__rotulo">
                    {periodo.numero}ª aula
                    <small>
                      {indice === 0 ? 'Primeira aula do dia' : 'Sequência da grade'}
                    </small>
                  </span>
                  <label className="campo">
                    <span className="campo__rotulo">Início</span>
                    <input
                      type="time"
                      className="campo__controle"
                      value={periodo.inicio}
                      onChange={(evento) =>
                        atualizarPeriodo(periodo.numero, 'inicio', evento.target.value)
                      }
                      aria-label={`Início da ${periodo.numero}ª aula`}
                    />
                  </label>
                  <label className="campo">
                    <span className="campo__rotulo">Término</span>
                    <input
                      type="time"
                      className="campo__controle"
                      value={periodo.fim}
                      onChange={(evento) =>
                        atualizarPeriodo(periodo.numero, 'fim', evento.target.value)
                      }
                      aria-label={`Término da ${periodo.numero}ª aula`}
                    />
                  </label>
                </div>

                {periodo.numero === 3 ? (
                  <div className="config-periodo config-periodo--intervalo">
                    <span className="config-periodo__rotulo">
                      <label className="linha-flex texto-medio">
                        <input
                          type="checkbox"
                          checked={possuiIntervalo}
                          onChange={(evento) => setPossuiIntervalo(evento.target.checked)}
                        />
                        Intervalo
                      </label>
                      <small>Após a 3ª aula</small>
                    </span>
                    <label className="campo">
                      <span className="campo__rotulo">Início</span>
                      <input
                        type="time"
                        className="campo__controle"
                        value={intervalo.inicio}
                        onChange={(evento) =>
                          setIntervalo((atual) => ({ ...atual, inicio: evento.target.value }))
                        }
                        disabled={!possuiIntervalo}
                        aria-label="Início do intervalo"
                      />
                    </label>
                    <label className="campo">
                      <span className="campo__rotulo">Término</span>
                      <input
                        type="time"
                        className="campo__controle"
                        value={intervalo.fim}
                        onChange={(evento) =>
                          setIntervalo((atual) => ({ ...atual, fim: evento.target.value }))
                        }
                        disabled={!possuiIntervalo}
                        aria-label="Término do intervalo"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="cartao__rodape">
          <div className="linha-flex linha-flex--entre">
            <span className="texto-pequeno texto-secundario">
              {possuiIntervalo
                ? 'Intervalo ativo entre a 3ª e a 4ª aula.'
                : 'Intervalo desativado nesta configuração.'}
            </span>
            <button
              type="button"
              className="botao botao--primario"
              onClick={() => void salvar()}
              disabled={salvando}
              aria-busy={salvando}
            >
              <Icone nome="check" tamanho={16} />
              {salvando ? 'Salvando…' : 'Salvar configuração'}
            </button>
          </div>
        </div>
      </section>

      <Alerta tipo="aviso" titulo="Impacto nos horários existentes">
        A alteração dos horários não migra automaticamente as aulas já cadastradas.
      </Alerta>
    </div>
  );
}

export function ConfiguracaoPage() {
  const { usuario } = useAutenticacao();

  // Todos os hooks são chamados incondicionalmente (regras do React).
  // A autorização de renderização é aplicada logo em seguida.
  const podeEditarConfiguracao = podeEditarDuracaoAulas(usuario?.papel);

  useTituloPagina('Configuração de horários');
  const { escola } = useServicos();
  const { dados, carregando, erro, recarregar } = useConsulta(
    () => escola.listarCatalogo(),
    'configuracao-horarios',
  );

  // A alteração da duração/horários das aulas é exclusiva do gestor.
  // Defesa em profundidade: a rota já bloqueia, mas o acesso direto por URL
  // também é barrado aqui.
  if (!podeEditarConfiguracao) {
    return <AcessoNegadoPage />;
  }

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Administração"
        titulo="Configuração de horários"
        descricao="Defina o funcionamento da escola, os horários de cada aula e o intervalo. A configuração é validada antes da gravação."
        acoes={
          <a className="botao botao--fantasma" href="#/painel/horarios">
            <Icone nome="calendario" tamanho={15} />
            Editar grade
          </a>
        }
      />

      {erro ? <EstadoErro texto={erro} onTentar={recarregar} /> : null}
      {carregando && !dados ? <EstadoCarregando /> : null}
      {dados && !erro ? (
        <FormularioConfiguracao
          key={dados.configuracao.atualizadoEm}
          configuracao={dados.configuracao}
          onSalvo={recarregar}
        />
      ) : null}
    </>
  );
}
