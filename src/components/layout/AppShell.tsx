import { useEffect, useState, type ReactNode } from 'react';
import { Icone, type NomeIcone } from '@/components/Icone';
import { SeloPapel } from '@/components/ui/Selos';
import { useAutenticacao } from '@/app/ContextoAutenticacao';
import { useFavoritos } from '@/app/ContextoFavoritos';
import { useNotificacoes } from '@/app/ContextoNotificacoes';
import { useServicos } from '@/app/ContextoServicos';
import { useToast } from '@/app/ContextoToast';
import { rolarAoTopo, rotaAtiva, useRotaAtual } from '@/app/roteamento';
import { useAtualizacaoPwa } from '@/app/useAtualizacaoPwa';
import {
  NOME_INSTITUICAO,
  NOME_SISTEMA,
  podeAdministrar,
  podeEditarDuracaoAulas,
  ROTULOS_PAPEL,
} from '@/lib/constantes';
import { iniciaisDoNome } from '@/lib/utilidades';

interface ItemNavegacao {
  para: string;
  rotulo: string;
  icone: NomeIcone;
  ativo: (rota: string) => boolean;
  contagem?: number;
}

interface GrupoNavegacao {
  titulo: string;
  itens: ItemNavegacao[];
}

export function AppShell({ children }: { children: ReactNode }) {
  const rota = useRotaAtual();
  const { usuario, sair } = useAutenticacao();
  const { modo, avisoConfiguracao } = useServicos();
  const { favoritos } = useFavoritos();
  const { naoLidas } = useNotificacoes();
  const { notificar } = useToast();
  const pwa = useAtualizacaoPwa();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    rolarAoTopo();
  }, [rota]);

  useEffect(() => {
    if (!menuAberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const aoPressionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAberto(false);
    };
    window.addEventListener('keydown', aoPressionar);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', aoPressionar);
    };
  }, [menuAberto]);

  if (!usuario) return null;

  const grupos: GrupoNavegacao[] = [
    {
      titulo: 'Consulta',
      itens: [
        {
          para: '/consulta',
          rotulo: 'Horários por turma',
          icone: 'calendario',
          ativo: (atual) => atual === '/consulta' || atual.startsWith('/consulta/turma/'),
        },
        {
          para: '/consulta/professor',
          rotulo: 'Aulas por professor',
          icone: 'usuarios',
          ativo: (atual) => atual.startsWith('/consulta/professor'),
        },
      ],
    },
    {
      titulo: 'Minha área',
      itens: [
        {
          para: '/favoritos',
          rotulo: 'Favoritos',
          icone: 'estrela',
          ativo: (atual) => rotaAtiva(atual, '/favoritos'),
          contagem: favoritos.length,
        },
        {
          para: '/notificacoes',
          rotulo: 'Notificações',
          icone: 'sino',
          ativo: (atual) => rotaAtiva(atual, '/notificacoes'),
          contagem: naoLidas,
        },
      ],
    },
  ];

  if (podeAdministrar(usuario.papel)) {
    let itensAdministracao: ItemNavegacao[] = [
      {
        para: '/painel',
        rotulo: 'Painel',
        icone: 'painel',
        ativo: (atual) => atual === '/painel',
      },
      {
        para: '/painel/professores',
        rotulo: 'Professores',
        icone: 'usuarios',
        ativo: (atual) => rotaAtiva(atual, '/painel/professores'),
      },
      {
        para: '/painel/disciplinas',
        rotulo: 'Disciplinas',
        icone: 'livro',
        ativo: (atual) => rotaAtiva(atual, '/painel/disciplinas'),
      },
      {
        para: '/painel/turmas',
        rotulo: 'Turmas',
        icone: 'predio',
        ativo: (atual) => rotaAtiva(atual, '/painel/turmas'),
      },
      {
        para: '/painel/arquivados',
        rotulo: 'Arquivados',
        icone: 'arquivar',
        ativo: (atual) => rotaAtiva(atual, '/painel/arquivados'),
      },
      {
        para: '/painel/horarios',
        rotulo: 'Horários',
        icone: 'calendario',
        ativo: (atual) => rotaAtiva(atual, '/painel/horarios'),
      },
      {
        para: '/painel/configuracao',
        rotulo: 'Configuração',
        icone: 'config',
        ativo: (atual) => rotaAtiva(atual, '/painel/configuracao'),
      },
      {
        para: '/painel/historico',
        rotulo: 'Histórico',
        icone: 'historico',
        ativo: (atual) => rotaAtiva(atual, '/painel/historico'),
      },
    ];
    if (!podeEditarDuracaoAulas(usuario.papel)) {
      itensAdministracao = itensAdministracao.filter(
        (item) => item.para !== '/painel/configuracao',
      );
    }
    grupos.push({
      titulo: 'Administração',
      itens: itensAdministracao,
    });
  }

  const aoSair = async () => {
    try {
      await sair();
      notificar('info', 'Sessão encerrada.');
    } catch {
      notificar('erro', 'Não foi possível encerrar a sessão.');
    }
  };

  return (
    <div className="app">
      <a className="pular-para-conteudo" href="#conteudo-principal">
        Pular para o conteúdo
      </a>

      {menuAberto ? (
        <button
          type="button"
          className="app__sobreposicao"
          aria-label="Fechar menu de navegação"
          onClick={() => setMenuAberto(false)}
        />
      ) : null}

      <aside
        className={`barra-lateral${menuAberto ? ' barra-lateral--aberta' : ''}`}
        id="navegacao-principal"
        aria-label="Navegação principal"
      >
        <a
          className="barra-lateral__marca"
          href="#/consulta"
          onClick={() => setMenuAberto(false)}
        >
          <span className="barra-lateral__titulo">{NOME_SISTEMA}</span>
          <span className="barra-lateral__instituicao">{NOME_INSTITUICAO}</span>
        </a>

        <nav className="barra-lateral__navegacao">
          {grupos.map((grupo) => (
            <div className="grupo-navegacao" key={grupo.titulo}>
              <p className="grupo-navegacao__titulo">{grupo.titulo}</p>
              <div className="grupo-navegacao__itens">
                {grupo.itens.map((item) => (
                  <a
                    key={item.para}
                    className="item-navegacao"
                    href={`#${item.para}`}
                    aria-current={item.ativo(rota) ? 'page' : undefined}
                    onClick={() => setMenuAberto(false)}
                  >
                    <Icone nome={item.icone} tamanho={17} />
                    <span>{item.rotulo}</span>
                    {typeof item.contagem === 'number' && item.contagem > 0 ? (
                      <span className="selo selo--contagem item-navegacao__contagem">
                        {item.contagem}
                      </span>
                    ) : null}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="barra-lateral__rodape">
          <span>{modo === 'demo' ? 'Ambiente de demonstração' : 'Ambiente de produção'}</span>
          <br />
          <span>Versão 0.1.0</span>
        </div>
      </aside>

      <div className="app__conteudo">
        {modo === 'demo' ? (
          <div className="faixa-modo">
            <Icone nome="info" tamanho={14} />
            <span>
              <strong>Demonstração</strong> — as alterações feitas neste ambiente não são salvas
              permanentemente.
            </span>
          </div>
        ) : null}

        {avisoConfiguracao ? (
          <div className="faixa-modo" role="alert">
            <Icone nome="alerta" tamanho={14} />
            <span>{avisoConfiguracao}</span>
          </div>
        ) : null}

        {pwa.atualizacaoDisponivel ? (
          <div className="banner-atualizacao" role="status">
            <span>Uma nova versão da aplicação está disponível.</span>
            <button type="button" className="botao botao--pequeno" onClick={pwa.aplicarAtualizacao}>
              <Icone nome="atualizar" tamanho={15} />
              Atualizar
            </button>
          </div>
        ) : null}

        <header className="topo">
          <div className="topo__inicio">
            <button
              type="button"
              className="botao botao--icone topo__menu"
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuAberto}
              aria-controls="navegacao-principal"
              onClick={() => setMenuAberto((aberto) => !aberto)}
            >
              <Icone nome={menuAberto ? 'fechar' : 'menu'} tamanho={20} />
            </button>
            <span className="topo__contexto">Consulta e gestão de horários escolares</span>
          </div>

          <div className="topo__fim">
            <a
              className="botao botao--icone"
              href="#/notificacoes"
              aria-label={
                naoLidas > 0 ? `Notificações, ${naoLidas} não lida(s)` : 'Notificações'
              }
              style={{ position: 'relative' }}
            >
              <Icone nome="sino" tamanho={19} />
              {naoLidas > 0 ? (
                <span
                  className="selo selo--contagem"
                  style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 4px', fontSize: '0.62rem' }}
                >
                  {naoLidas > 99 ? '99+' : naoLidas}
                </span>
              ) : null}
            </a>

            <div className="usuario-topo">
              <span className="avatar-inicial" aria-hidden="true">
                {iniciaisDoNome(usuario.nome)}
              </span>
              <div className="usuario-topo__identidade">
                <span className="usuario-topo__nome">{usuario.nome}</span>
                <span className="usuario-topo__papel">{ROTULOS_PAPEL[usuario.papel]}</span>
              </div>
              <span className="somente-leitor">
                Perfil de acesso: <SeloPapel papel={usuario.papel} />
              </span>
              <button
                type="button"
                className="botao botao--icone"
                onClick={aoSair}
                aria-label="Sair da conta"
                title="Sair"
              >
                <Icone nome="sair" tamanho={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="principal" id="conteudo-principal" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
