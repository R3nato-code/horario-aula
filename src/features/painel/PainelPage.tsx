import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { Icone } from '@/components/Icone';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { useConsulta } from '@/app/useConsulta';
import { useServicos } from '@/app/ContextoServicos';
import { podeEditarDuracaoAulas } from '@/lib/constantes';
import { useTituloPagina } from '@/lib/useTituloPagina';
import { formatarDataHora } from '@/lib/utilidades';

const ATALHOS = [
  { para: '/painel/professores', rotulo: 'Gerenciar professores', icone: 'usuarios' as const },
  { para: '/painel/disciplinas', rotulo: 'Gerenciar disciplinas', icone: 'livro' as const },
  { para: '/painel/turmas', rotulo: 'Gerenciar turmas', icone: 'predio' as const },
  { para: '/painel/horarios', rotulo: 'Editar horários', icone: 'calendario' as const },
  { para: '/painel/configuracao', rotulo: 'Configurar aulas', icone: 'config' as const },
  { para: '/painel/historico', rotulo: 'Consultar histórico', icone: 'historico' as const },
];

export function PainelPage() {
  useTituloPagina('Painel administrativo');
  const { usuario } = useAutenticacao();
  const { escola } = useServicos();

  const atalhosVisiveis = ATALHOS.filter((atalho) =>
    atalho.para === '/painel/configuracao'
      ? podeEditarDuracaoAulas(usuario?.papel)
      : true,
  );
  const { dados, carregando, erro, recarregar } = useConsulta(async () => {
    const [catalogo, aulas, historico] = await Promise.all([
      escola.listarCatalogo(),
      escola.listarAulas(),
      escola.listarHistorico(),
    ]);
    return { catalogo, aulas, historico };
  }, 'painel-administrativo');

  const turmasAtivas = dados?.catalogo.turmas.filter((turma) => turma.status === 'ativo') ?? [];
  const professoresAtivos =
    dados?.catalogo.professores.filter((professor) => professor.status === 'ativo') ?? [];
  const disciplinasAtivas =
    dados?.catalogo.disciplinas.filter((disciplina) => disciplina.status === 'ativo') ?? [];

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Administração"
        titulo="Painel administrativo"
        descricao="Visão geral do catálogo escolar e atalhos para as operações permitidas ao seu perfil."
      />

      {erro ? <EstadoErro texto={erro} onTentar={recarregar} /> : null}
      {carregando && !dados ? <EstadoCarregando texto="Carregando painel…" /> : null}

      {dados && !erro ? (
        <div className="pilha-secoes">
          <section aria-labelledby="indicadores-titulo">
            <p className="rotulo-secao" id="indicadores-titulo">
              Situação atual
            </p>
            <div className="indicadores">
              <div className="indicador">
                <span className="indicador__rotulo">Turmas ativas</span>
                <span className="indicador__valor">{turmasAtivas.length}</span>
                <span className="indicador__nota">no catálogo atual</span>
              </div>
              <div className="indicador indicador--areia">
                <span className="indicador__rotulo">Professores ativos</span>
                <span className="indicador__valor">{professoresAtivos.length}</span>
                <span className="indicador__nota">cadastros disponíveis para aulas</span>
              </div>
              <div className="indicador indicador--azul">
                <span className="indicador__rotulo">Disciplinas ativas</span>
                <span className="indicador__valor">{disciplinasAtivas.length}</span>
                <span className="indicador__nota">disponíveis para a grade</span>
              </div>
              <div className="indicador indicador--argila">
                <span className="indicador__rotulo">Aulas na semana</span>
                <span className="indicador__valor">{dados.aulas.length}</span>
                <span className="indicador__nota">segunda a sexta-feira</span>
              </div>
            </div>
          </section>

          <div className="grade-duas-colunas">
            <section className="cartao" aria-labelledby="atalhos-titulo">
              <div className="cartao__cabecalho">
                <h2 className="cartao__titulo" id="atalhos-titulo">
                  Operações
                </h2>
              </div>
              <div className="cartao__corpo">
                <div className="atalhos">
                  {atalhosVisiveis.map((atalho) => (
                    <a className="atalho" href={`#${atalho.para}`} key={atalho.para}>
                      <span>{atalho.rotulo}</span>
                      <Icone nome={atalho.icone} tamanho={17} />
                    </a>
                  ))}
                </div>
              </div>
            </section>

            <section className="cartao" aria-labelledby="config-resumo-titulo">
              <div className="cartao__cabecalho">
                <h2 className="cartao__titulo" id="config-resumo-titulo">
                  Configuração vigente
                </h2>
                <a className="texto-pequeno" href="#/painel/configuracao">
                  Editar
                </a>
              </div>
              <div className="cartao__corpo">
                {dados.catalogo.configuracao.periodos.length === 0 ? (
                  <p className="texto-secundario texto-medio">Configuração ainda não definida.</p>
                ) : (
                  <dl className="rotulo-valor" style={{ padding: 0 }}>
                    <dt>Funcionamento</dt>
                    <dd>
                      {dados.catalogo.configuracao.abertura}–{dados.catalogo.configuracao.fechamento}
                    </dd>
                    {dados.catalogo.configuracao.periodos.map((periodo) => (
                      <div key={periodo.numero} style={{ display: 'contents' }}>
                        <dt>{periodo.numero}ª aula</dt>
                        <dd>
                          {periodo.inicio}–{periodo.fim}
                        </dd>
                      </div>
                    ))}
                    {dados.catalogo.configuracao.intervalo ? (
                      <>
                        <dt>Intervalo</dt>
                        <dd>
                          {dados.catalogo.configuracao.intervalo.inicio}–
                          {dados.catalogo.configuracao.intervalo.fim}
                        </dd>
                      </>
                    ) : null}
                  </dl>
                )}
              </div>
            </section>
          </div>

          <section className="cartao" aria-labelledby="historico-recente-titulo">
            <div className="cartao__cabecalho">
              <h2 className="cartao__titulo" id="historico-recente-titulo">
                Alterações recentes
              </h2>
              <a className="texto-pequeno" href="#/painel/historico">
                Ver histórico completo
              </a>
            </div>
            <div className="cartao__corpo">
              {dados.historico.length === 0 ? (
                <EstadoVazio
                  titulo="Nenhuma alteração registrada"
                  texto="O histórico será preenchido quando uma aula ou configuração for alterada."
                />
              ) : (
                <ul className="lista-limpa">
                  {dados.historico.slice(0, 5).map((registro) => (
                    <li className="item-lista" key={registro.id}>
                      <div className="item-lista__principal">
                        <p className="item-lista__titulo">{registro.descricao}</p>
                        <p className="item-lista__meta">
                          {registro.responsavelNome} · {formatarDataHora(registro.timestamp)}
                        </p>
                      </div>
                      <span className="selo">{registro.tipo}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
