import { useMemo, useState } from 'react';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { Alerta } from '@/components/ui/Alerta';
import { Icone } from '@/components/Icone';
import { useNotificacoes } from '@/app/ContextoNotificacoes';
import { useTituloPagina } from '@/lib/useTituloPagina';
import { formatarDataHora } from '@/lib/utilidades';

type Filtro = 'todas' | 'nao-lidas';

export function NotificacoesPage() {
  useTituloPagina('Notificações');
  const {
    notificacoes,
    naoLidas,
    carregando,
    erro,
    recarregar,
    marcarLida,
    marcarTodasLidas,
  } = useNotificacoes();
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const lista = useMemo(
    () =>
      filtro === 'todas'
        ? notificacoes
        : notificacoes.filter((notificacao) => !notificacao.lida),
    [filtro, notificacoes],
  );

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Minha área"
        titulo="Notificações"
        descricao="Avisos internos sobre alterações concluídas em aulas de turmas que você favoritou."
        acoes={
          <button
            type="button"
            className="botao"
            onClick={() => void marcarTodasLidas()}
            disabled={naoLidas === 0}
          >
            <Icone nome="check" tamanho={16} />
            Marcar todas como lidas
          </button>
        }
      />

      {erro ? <EstadoErro texto={erro} onTentar={recarregar} /> : null}
      {carregando && notificacoes.length === 0 ? <EstadoCarregando /> : null}

      {!erro ? (
        <div className="pilha-secoes">
          <div className="abas" role="tablist" aria-label="Filtrar notificações">
            <button
              type="button"
              role="tab"
              className="aba"
              aria-selected={filtro === 'todas'}
              onClick={() => setFiltro('todas')}
            >
              Todas ({notificacoes.length})
            </button>
            <button
              type="button"
              role="tab"
              className="aba"
              aria-selected={filtro === 'nao-lidas'}
              onClick={() => setFiltro('nao-lidas')}
            >
              Não lidas ({naoLidas})
            </button>
          </div>

          {lista.length === 0 && !carregando ? (
            <EstadoVazio
              titulo={filtro === 'nao-lidas' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
              texto={
                filtro === 'nao-lidas'
                  ? 'Você já leu todas as notificações disponíveis.'
                  : 'As notificações aparecem quando uma aula de uma turma favorita é alterada com sucesso.'
              }
            />
          ) : (
            <div>
              {lista.map((notificacao) => (
                <article
                  className={`notificacao${notificacao.lida ? '' : ' notificacao--nao-lida'}`}
                  key={notificacao.id}
                >
                  <span className="notificacao__marca" aria-hidden="true" />
                  <div className="notificacao__corpo">
                    <p className="notificacao__titulo">
                      {notificacao.titulo}
                      {notificacao.agrupamento ? (
                        <span className="selo selo--info" style={{ marginLeft: '8px' }}>
                          {notificacao.agrupamento.totalAulas} aulas
                        </span>
                      ) : null}
                    </p>
                    <p className="notificacao__texto">{notificacao.mensagem}</p>
                    <p className="notificacao__meta">
                      <span>{formatarDataHora(notificacao.criadoEm)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{notificacao.lida ? 'Lida' : 'Não lida'}</span>
                    </p>
                  </div>
                  <div className="notificacao__acoes">
                    {!notificacao.lida ? (
                      <button
                        type="button"
                        className="botao botao--fantasma botao--pequeno"
                        onClick={() => void marcarLida(notificacao.id)}
                      >
                        <Icone nome="check" tamanho={14} />
                        Marcar como lida
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}

          <Alerta tipo="info" titulo="Sobre as notificações">
            As notificações são internas ao site e só são geradas após a conclusão bem-sucedida da
            alteração. Operações em massa devem gerar um aviso agrupado. Não existe mural de avisos
            escolares nesta versão.
          </Alerta>
        </div>
      ) : null}
    </>
  );
}